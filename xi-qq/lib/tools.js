// QQ 工具面：把「发言」从自动转发改成显式工具调用。
//
// 设计参照 Mieksido/surfcore 的 reserved2（二代仿真）：
//   文本输出只是思考，不会发到 QQ；要说话必须调 qq_send_message / qq_send_burst。
// 为什么值得换：自动转发模型时，出站消息没法逐条审计、限速、拦截；
// 换成工具之后，「想说什么」和「真的发了」之间多了一个可以拦的关卡。
//
// 工具只挂在 QQ 会话的 agent 上（agent.ctx.tools.register），
// 阿晚在网页里跟我聊天的会话不会出现这些工具——和 scene.js 一样是 agent 作用域。
import { toPlain, splitChat, splitText } from './text.js'

// 一次最多发几条（防模型一口气排 20 条）
const BURST_MAX = 5
// qq_wait_for_messages 的等待上限
const WAIT_MAX_MS = 300000

const textOut = (text) => [{ type: 'text', text: String(text) }]

const resultSchema = (extra = {}) => ({
  type: 'object',
  properties: {
    ok: { type: 'boolean', description: '是否成功；失败时看 reason' },
    sent: { type: 'number', description: '实际发到 QQ 的条数' },
    reason: { type: 'string', description: '失败、跳过或被限流的原因' },
    ...extra,
  },
  required: ['ok'],
})

export function createQqTools({ getSettings, getBot, limiter, transcript, trace = () => {} }) {
  const attached = new WeakMap()      // agent -> { peer, dispose }
  const holding = new Set()           // peer：等待期间由工具接手入站消息，不再开新回合
  const pending = new Map()           // peer -> [{from,text,at}] 等待期间收到的消息
  const waiters = new Map()           // peer -> [resolve]
  const closings = new Map()          // peer -> {note,next,at}
  let turn = { sends: 0 }

  // ── 一轮的记账：index.js 在每次 prompt 前后清零/读取 ─────────────────────
  function resetTurn() { turn = { sends: 0 } }
  function turnSends() { return turn.sends }

  // ── 发送：唯一的出站口，所有闸门都在这里 ─────────────────────────────────
  async function deliver({ peer, kind, target }, text, { replyTo, skipGap = false } = {}) {
    const settings = getSettings()
    const cfg = settings.tools || {}
    const bot = getBot()
    if (!bot || !bot.isUp()) return { ok: false, sent: 0, reason: 'QQ 未连接' }

    const clean = toPlain(String(text ?? ''))
    if (!clean) return { ok: false, sent: 0, reason: '空消息' }

    if (settings.limits?.dailyEnabled !== false) {
      const day = limiter.dailyAllow(settings.limits?.dailyReplies)
      if (!day.ok) return { ok: false, sent: 0, reason: `今日总量到顶（${day.used} 条）` }
    }
    // 发送频率：这里的闸门只管「发」，和唤醒那套限流互不影响
    // skipGap 给 qq_send_burst 用：它自己按气泡节奏排间隔，不该被单条冷却卡住
    const gate = limiter.allow(`${peer}:send`, {
      minIntervalSec: skipGap ? 0 : Number(cfg.minIntervalSec ?? 2),
      maxPerHour: Number(cfg.maxPerHour ?? 60),
    })
    if (!gate.ok) {
      return {
        ok: false,
        sent: 0,
        reason: gate.reason === 'cooldown'
          ? `太快了，还差 ${Math.ceil((gate.waitMs || 0) / 1000)} 秒`
          : `这一小时说话次数用完了（${gate.used} 条）`,
      }
    }

    const maxChars = Number(settings.maxReplyChars) || 1500
    const chunks = settings.chat?.chunkReply === false
      ? splitText(clean, maxChars)
      : splitChat(clean, settings.chat?.maxChunks || 3).flatMap((c) => splitText(c, maxChars))

    let sent = 0
    for (let i = 0; i < chunks.length; i += 1) {
      if (i) await new Promise((r) => setTimeout(r, 600 + Math.random() * 1000))
      try {
        await bot.sendText({ kind, target, text: chunks[i], replyTo: i === 0 ? replyTo : undefined })
        sent += 1
        transcript?.record?.(peer, { fromSelf: true, name: '我', text: chunks[i] })
      } catch (err) {
        trace(`tool send failed ${peer}: ${err?.message || err}`)
        return { ok: sent > 0, sent, reason: `第 ${i + 1} 条发送失败：${err?.message || err}` }
      }
    }
    turn.sends += sent
    trace(`tool send ${peer} chunks=${sent} chars=${clean.length}`)
    return { ok: true, sent }
  }

  // ── 入站：等待期间由工具接手，不再开新回合 ───────────────────────────────
  const isHolding = (peer) => holding.has(peer)

  function feed(peer, message) {
    const list = waiters.get(peer)
    if (list?.length) {
      const resolve = list.shift()
      waiters.set(peer, list)
      resolve([message])
      return true
    }
    const buf = pending.get(peer) || []
    buf.push(message)
    if (buf.length > 50) buf.shift()
    pending.set(peer, buf)
    return true
  }

  function waitFor(peer, timeoutMs) {
    const ms = Math.max(1000, Math.min(WAIT_MAX_MS, Number(timeoutMs) || 60000))
    const buffered = pending.get(peer) || []
    if (buffered.length) {
      pending.set(peer, [])
      return Promise.resolve({ messages: buffered, waited: 0 })
    }
    return new Promise((resolve) => {
      const started = Date.now()
      let timer = null
      const list = waiters.get(peer) || []
      const finish = (messages) => {
        clearTimeout(timer)
        const rest = (waiters.get(peer) || []).filter((fn) => fn !== finish)
        waiters.set(peer, rest)
        resolve({ messages: messages || [], waited: Date.now() - started })
      }
      list.push(finish)
      waiters.set(peer, list)
      timer = setTimeout(() => finish([]), ms)
    })
  }

  // ── 工具定义 ─────────────────────────────────────────────────────────────
  function build({ peer, kind, target }) {
    const place = kind === 'group' ? '这个群' : '这个私聊'
    return [
      {
        name: 'qq_send_message',
        description:
          `在${place}发一条消息。这是唯一能让对方看见你的方式——你的文字输出不会自动发出去。`
          + '消息会自动按句断成几段（像人分几次打完），不用自己加换行或标点来分条。',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: '要说的话，口语、短句，别用 markdown。' },
            reply_to: { type: 'string', description: '可选：要引用回复的 messageId（QQ 消息 id，不是序号）。' },
          },
          required: ['text'],
          additionalProperties: false,
        },
        output: { schema: resultSchema(), render: (_a, v) => textOut(v.ok ? `已发 ${v.sent} 条` : `没发出去：${v.reason || '未知原因'}`) },
        async execute(args) {
          return await deliver({ peer, kind, target }, args?.text, { replyTo: args?.reply_to })
        },
      },
      {
        name: 'qq_send_burst',
        description:
          `一次发多条（最多 ${BURST_MAX} 条），每条一个气泡。适合连珠炮：先说一句，停半秒再说一句。`
          + '单条内容不要自己拆，交给这个工具。',
        parameters: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              items: { type: 'string' },
              description: `要说的话，每条一句，最多 ${BURST_MAX} 条。`,
            },
          },
          required: ['messages'],
          additionalProperties: false,
        },
        output: { schema: resultSchema(), render: (_a, v) => textOut(v.ok ? `已发 ${v.sent} 条` : `没发出去：${v.reason || '未知原因'}`) },
        async execute(args) {
          const list = Array.isArray(args?.messages) ? args.messages : []
          if (!list.length) return { ok: false, sent: 0, reason: 'messages 为空' }
          let sent = 0
          for (const item of list.slice(0, BURST_MAX)) {
            const r = await deliver({ peer, kind, target }, item, { skipGap: true })
            sent += r.sent || 0
            if (!r.ok) return { ok: sent > 0, sent, reason: r.reason }
            await new Promise((r2) => setTimeout(r2, 500 + Math.random() * 700))
          }
          return { ok: true, sent }
        },
      },
      {
        name: 'qq_get_recent_messages',
        description: `回看${place}最近说过什么（只读）。提示词里已经挂了一段近况，需要更早的再调这个。`,
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: '要几条，默认 10，最多 30。' },
          },
          additionalProperties: false,
        },
        output: {
          schema: resultSchema({ text: { type: 'string', description: '渲染好的对话文本' } }),
          render: (_a, v) => textOut(v.text || '（没有可回看的内容）'),
        },
        async execute(args) {
          const limit = Math.max(1, Math.min(30, Number(args?.limit) || 10))
          const text = transcript?.render?.(peer, {
            limit,
            maxChars: 1500,
            title: kind === 'group' ? '群聊' : '私聊',
          }) || ''
          return { ok: true, text }
        },
      },
      {
        name: 'qq_wait_for_messages',
        description:
          '安静等一段时间，看对方还会不会接着说（最多 5 分钟）。等待期间来的消息会直接返回给你，'
          + '并且不会另外开一轮——所以「先别急着回，等人说完」要用这个，不要自己截断。'
          + '这不是潜水，只是等；不想等了就结束这一轮。',
        parameters: {
          type: 'object',
          properties: {
            timeoutMs: { type: 'number', description: '等多久，默认 60000，最多 300000。' },
          },
          additionalProperties: false,
        },
        output: {
          schema: resultSchema({
            messages: {
              type: 'array',
              description: '等待期间收到的消息',
              items: {
                type: 'object',
                properties: { from: { type: 'string' }, text: { type: 'string' } },
              },
            },
            waited: { type: 'number', description: '实际等了多久（毫秒）' },
          }),
          render: (_a, v) => textOut(
            v.messages?.length
              ? v.messages.map((m) => `${m.from}：${m.text}`).join('\n')
              : `等了 ${Math.round((v.waited || 0) / 1000)} 秒，没人接着说。`,
          ),
        },
        async execute(args) {
          holding.add(peer)
          try {
            const { messages, waited } = await waitFor(peer, args?.timeoutMs)
            return { ok: true, messages, waited }
          } finally {
            holding.delete(peer)
          }
        },
      },
      {
        name: 'qq_close_conversation',
        description:
          '这段聊到自然结束了，记一句「收在哪、下次怎么接」，然后就不用再说话了。'
          + '不是永久不理——下次被唤醒时会带着这条记录回来。对方还在明确提问时不要用。',
        parameters: {
          type: 'object',
          properties: {
            note: { type: 'string', description: '收在什么地方，一句话。' },
            next: { type: 'string', description: '可选：下次打算怎么接。' },
          },
          required: ['note'],
          additionalProperties: false,
        },
        output: { schema: resultSchema(), render: (_a, v) => textOut(v.ok ? '记住了，这段收尾。' : `没记上：${v.reason}`) },
        async execute(args) {
          const note = String(args?.note ?? '').trim()
          if (!note) return { ok: false, reason: 'note 为空' }
          closings.set(peer, { note: note.slice(0, 200), next: String(args?.next ?? '').slice(0, 200), at: Date.now() })
          trace(`closure ${peer}: ${note.slice(0, 60)}`)
          return { ok: true, sent: 0 }
        },
      },
    // resolve 给宿主的规定动作留个位：原样返回参数即可（不在这里校验，免得静默丢键）
    ].map((def) => ({ resolve: (args) => (args && typeof args === 'object' ? args : {}), ...def }))
  }

  // ── 挂到某个 agent 上（一个会话挂一次）──────────────────────────────────
  function attach(agent, ctxInfo) {
    if (!agent || !agent.ctx || !ctxInfo?.peer) return false
    const prev = attached.get(agent)
    if (prev) {
      if (prev.peer === ctxInfo.peer) return true
      detach(agent)
    }
    let tools = null
    try {
      tools = typeof agent.ctx.get === 'function' ? agent.ctx.get('tools') : agent.ctx.tools
    } catch { tools = null }
    if (!tools || typeof tools.register !== 'function') {
      trace(`tools: ${ctxInfo.peer} 的 agent 上没有 tools 服务，退回自动转发`)
      return false
    }
    const disposers = []
    try {
      for (const def of build(ctxInfo)) disposers.push(tools.register(def))
    } catch (err) {
      trace(`tools: 注册失败 ${ctxInfo.peer} — ${err?.message || err}，退回自动转发`)
      for (const d of disposers) { try { d?.() } catch { /* 已经随 agent 一起没了 */ } }
      return false
    }
    attached.set(agent, { peer: ctxInfo.peer, dispose: () => disposers.forEach((d) => { try { d?.() } catch { /* ignore */ } }) })
    trace(`tools: 已挂 ${ctxInfo.peer}（${disposers.length} 个）`)
    return true
  }

  function detach(agent) {
    const prev = attached.get(agent)
    if (!prev) return
    attached.delete(agent)
    try { prev.dispose?.() } catch { /* ignore */ }
  }

  function disposeAll() {
    for (const [agent] of attached) detach(agent)
    holding.clear()
    pending.clear()
    waiters.clear()
  }

  /** 收尾记录：给下一轮的提示词用。 */
  function closingFor(peer) {
    const hit = closings.get(peer)
    if (!hit) return ''
    const age = Math.round((Date.now() - hit.at) / 60000)
    return `【上次收尾】${hit.note}${hit.next ? `；下次：${hit.next}` : ''}（${age} 分钟前）`
  }

  return {
    attach,
    detach,
    disposeAll,
    deliver,
    isHolding,
    feed,
    closingFor,
    resetTurn,
    turnSends,
  }
}
