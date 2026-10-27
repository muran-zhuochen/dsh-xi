// 汐 · QQ 接入（宿主半侧）
// QQ(手机/PC) ←→ NapCat / OneBot 11 ←→ 本插件 ←→ DSH 会话 ←→ 汐
//
// 配置在 ~/.dsh/xi-qq/settings.json，改文件即时生效（每 2 秒看一次 mtime），
// 「汐」控制台的开关和频率也都写这个文件。
import fs from 'node:fs'
import { createOneBot } from './onebot.js'
import { createBridge } from './bridge.js'
import { loadSettings, log, readJson, REJECTED_PATH, SETTINGS_PATH, STATUS_PATH, writeJson } from './settings.js'
import { extractText, isAtSelf, toPlain, splitText, splitChat } from './text.js'
import { createLimiter } from './rate.js'
import { createTranscript } from './transcript.js'
import { createScenes } from './scene.js'
import { createQqTools } from './tools.js'

export const name = 'dsh-xi-qq'

const VERSION = '0.5.0'
const POLL_MS = 2000
const HEARTBEAT_MS = 30000
// 说话风格注入版本：文案改了就把数字 +1，老会话会重发一次新文案
const STYLE_VERSION = 2
const STYLE_NOTE = '（QQ 通道）现在是在 QQ 上聊天，不是在交作业：口语、短句，不用 markdown 和列表。该短就短，该展开就展开，可以贫、可以顶回来、可以只回一个字。别端着，别写成报告。'

// 工具模式说明：只在挂上工具面的会话里发一次，告诉模型「说话要调工具」
const TOOL_NOTE = '（QQ 通道·工具模式）你的文字输出不会发到 QQ。要说话就调 qq_send_message（想连发几条用 qq_send_burst）；想等对方说完再回就调 qq_wait_for_messages；这段聊到自然结束了调 qq_close_conversation 记一句「收在哪、下次怎么接」。不想说话就什么工具都别调——一个字也不会发出去，这不是失礼。'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function apply(ctx, config) {
  const trace = (message) => log(message)
  let settings = loadSettings(config || {})
  // 账号在上次运行里学到过（settings 没写死时），接着用，界面不用等第一条消息
  let selfId = String(settings.selfId || readJson(STATUS_PATH, {}).selfId || '')
  let bot = null
  let activeUrl = ''
  trace(`apply v${VERSION} enabled=${settings.enabled} ws=${settings.wsUrl} groups=[${(settings.groups || []).join(',')}]`)

  const getService = (key) => {
    try {
      const value = ctx.get ? ctx.get(key) : ctx[key]
      return value || undefined
    } catch { return undefined }
  }

  const transcript = createTranscript({ trace })
  const scenes = createScenes({ trace, getSettings: () => settings, transcript })
  const bridge = createBridge({ getService, getSettings: () => settings, trace, scenes })
  const limiter = createLimiter()
  // 工具面：qq_* 工具只挂在 QQ 会话的 agent 上，别的会话看不见
  const tools = createQqTools({
    getSettings: () => settings,
    getBot: () => bot,
    limiter,
    transcript,
    trace,
  })
  // 提示词里的「工具模式」说明，每个对端发一次（重启后重发一次，不占什么）
  const toolNoted = new Set()
  const styled = new Set(Object.keys(bridge.known).filter((k) => (bridge.known[k]?.styleVersion || 0) >= STYLE_VERSION))
  const typingOk = { private: true, group: true }

  // 白名单外来找过的人/群：只记一笔（不建会话、不回话），控制台里能看到并一键加进来。
  const rejected = readJson(REJECTED_PATH, {})
  let rejectedTimer = null
  const noteRejected = (kind, id, name = '') => {
    const key = `${kind}:${id}`
    const prev = rejected[key] || {}
    rejected[key] = {
      kind,
      id: String(id),
      name: String(name || prev.name || ''),
      at: Date.now(),
      firstAt: Number(prev.firstAt) || Date.now(),
      count: (Number(prev.count) || 0) + 1,
    }
    // 只留最近 60 个，别让文件无限长
    const all = Object.entries(rejected).sort((a, b) => (b[1].at || 0) - (a[1].at || 0))
    for (const [stale] of all.slice(60)) delete rejected[stale]
    if (rejectedTimer) return
    rejectedTimer = setTimeout(() => {
      rejectedTimer = null
      writeJson(REJECTED_PATH, rejected)
    }, 1200)
  }

  const writeStatus = (extra = {}) => {
    if (!selfId) selfId = String(readJson(STATUS_PATH, {}).selfId || '')
    writeJson(STATUS_PATH, {
      at: new Date().toISOString(),
      version: VERSION,
      enabled: settings.enabled !== false,
      connected: !!(bot && bot.isUp()),
      napcatUp: !!(bot && bot.isUp()),
      selfId,
      peers: Object.keys(bridge.known).length,
      autostart: !!settings.autostartNapCat,
      daily: limiter.dailySnapshot(),
      ...extra,
    })
  }

  function startBot() {
    if (bot) return
    activeUrl = settings.wsUrl
    bot = createOneBot({
      url: settings.wsUrl,
      token: settings.accessToken,
      trace,
      onEvent: (event) => { void onMessage(event) },
      onState: () => writeStatus(),
    })
    bot.start()
    trace(`bot: 启动，连 ${settings.wsUrl}`)
    writeStatus()
  }

  function stopBot() {
    if (!bot) return
    bot.stop()
    bot = null
    activeUrl = ''
    trace('bot: 已停止')
    writeStatus()
  }

  /** 重新读配置；下面这些开关注释里说的「即时生效」就是这里。 */
  function applySettings() {
    const next = loadSettings(config || {})
    const urlChanged = next.wsUrl !== activeUrl
    settings = next
    if (next.selfId) selfId = String(next.selfId)
    if (next.enabled === false) stopBot()
    else if (!bot || urlChanged) { stopBot(); startBot() }
    writeStatus()
    trace(`settings: enabled=${next.enabled} private=${next.privateChat?.enabled} groups=${next.groupPolicy?.enabled} list=[${(next.groups || []).join(',')}]`)
  }

  // 每个对端串行：一条没答完不会被下一条插队
  const tails = new Map()
  const enqueue = (peer, job) => {
    const previous = tails.get(peer) || Promise.resolve()
    const next = previous.then(job).catch((err) => trace(`job failed ${peer}: ${err?.stack || err?.message || err}`))
    tails.set(peer, next)
    void next.finally(() => { if (tails.get(peer) === next) tails.delete(peer) })
  }

  const claimed = new Set()
  const warned = new Set() // 同一个对端只提示一次，免得刷屏
  const warnOnce = (key, line) => {
    if (warned.has(key)) return
    warned.add(key)
    trace(line)
  }
  const dedupe = (id) => {
    if (id === undefined || id === null) return false
    const key = String(id)
    if (claimed.has(key)) return true
    claimed.add(key)
    if (claimed.size > 500) claimed.delete(claimed.values().next().value)
    return false
  }

  const senderName = (event) => {
    const s = event.sender || {}
    return String(s.card || s.nickname || s.user_id || '某人').slice(0, 24)
  }

  async function setTyping(kind, target, on) {
    if (!settings.chat?.typing || !bot || !bot.isUp()) return
    if (!typingOk[kind]) return
    try {
      const params = kind === 'group'
        ? { group_id: Number(target), event_type: on ? 1 : 2 }
        : { user_id: Number(target), event_type: on ? 1 : 2 }
      await bot.call('set_input_status', params, 5000)
    } catch (err) {
      typingOk[kind] = false
      trace(`typing 关闭（${kind}）：${err.message}`)
    }
  }

  async function onMessage(event) {
    if (event.post_type !== 'message') return
    if (settings.enabled === false) return

    const eventSelf = String(event.self_id || '')
    if (eventSelf && eventSelf !== selfId) { selfId = eventSelf; writeStatus() }
    const userId = String(event.user_id || '')
    if (!userId || (selfId && userId === selfId)) return
    if (dedupe(event.message_id)) return

    const type = event.message_type
    const text = extractText(event.message)
    if (!text) return
    const name = senderName(event)

    if (type === 'private') {
      if (settings.privateChat?.enabled === false) return
      // 默认拒绝：私聊白名单为空 = 谁都不回，只有名单里的人能进来
      if (!(settings.allowUsers || []).includes(userId)) {
        noteRejected('private', userId, name)
        warnOnce(`private:${userId}`, `skip private ${userId}（${name}）：不在私聊白名单 allowUsers，已忽略`)
        return
      }
      const peer = `private:${userId}`
      transcript.record(peer, { id: event.message_id, name, uid: userId, text })
      // 她正在用 qq_wait_for_messages 等：这条由工具收下，不再另开一轮（否则会回两次）
      if (tools.isHolding(peer)) { tools.feed(peer, { from: name, text }); return }
      const gate = limiter.allow(peer, settings.privateChat || {})
      if (!gate.ok) { trace(`private ${userId} 限流（${gate.reason}）`); return }
      enqueue(peer, () => reply({
        kind: 'private', target: userId, peer, userId, name, text,
        messageId: event.message_id,
      }))
      return
    }

    if (type !== 'group') return
    const groupId = String(event.group_id || '')
    const groups = settings.groups || []
    if (!groups.includes(groupId)) {
      noteRejected('group', groupId, event.group_name || '')
      warnOnce(`group:${groupId}`, groups.length
        ? `group ${groupId} 不在 groups 白名单，已忽略；要接就把它加进来`
        : `group ${groupId} 被忽略：groups 白名单是空的（空 = 群里一律不回）`)
      return
    }
    if (settings.groupPolicy?.enabled === false) return

    const mentioned = isAtSelf(event.message, selfId)
    const clean = selfId ? text.replaceAll(`@${selfId}`, '').trim() : text
    const bare = mentioned && !clean
    if (!clean && !mentioned) return
    const body = bare ? '（只 @ 了我，没有正文）' : clean
    const peer = `group:${groupId}`
    // 白名单里的每一条都落盘，不管点没点我——她开口的时候才看得见刚才发生了什么
    transcript.record(peer, { id: event.message_id, name, uid: userId, text: bare ? '@ 了你' : clean })
    // 同上：等待期间的消息归工具，不另开回合
    if (tools.isHolding(peer)) { tools.feed(peer, { from: name, text: bare ? '@ 了你' : clean }); return }

    const policy = settings.groupPolicy || {}

    if (mentioned) {
      const mention = policy.mention || {}
      if (mention.enabled === false) return
      const gate = limiter.allow(`group:${groupId}:mention`, mention)
      if (!gate.ok) { trace(`group ${groupId} @ 限流（${gate.reason}）`); return }
      enqueue(peer, () => reply({
        kind: 'group', target: groupId, peer, userId, name, text: body,
        messageId: event.message_id,
        prompt: bare
          ? `${name} 只 @ 了你，没写正文。用一句自然的反应回他，别长篇。`
          : `${name}：${clean}`,
      }))
      return
    }

    // 没被 @：主动插话，四道闸
    const ambient = policy.ambient || {}
    if (!ambient.enabled) return
    const trigger = String(ambient.trigger || 'keywords')
    const keys = (ambient.keywords || []).filter(Boolean)
    const plain = clean.replace(/\[[^\]]*\]/g, '').replace(/@\S+/g, '').trim()
    if (trigger === 'any') {
      // 「任何话都可能接」也要有个下限：纯表情 / 单个字不凑热闹
      if (plain.length < 2) return
    } else {
      const hitKeyword = keys.some((k) => clean.includes(k))
      const hitQuestion = /[?？]/.test(clean) || /吗|呢|怎么|为什么|谁|哪个/.test(clean)
      if (!hitKeyword && !hitQuestion) return
    }
    const gate = limiter.allow(`group:${groupId}:ambient`, ambient)
    if (!gate.ok) { trace(`group ${groupId} 插话限流（${gate.reason}）`); return }
    const chance = Number(ambient.chance)
    if (Number.isFinite(chance) && chance > 0 && chance < 1 && Math.random() > chance) {
      trace(`group ${groupId} 插话掷骰子没过`)
      return
    }
    trace(`group ${groupId} 主动插话：${clean.slice(0, 40)}`)
    enqueue(peer, () => reply({
      kind: 'group', target: groupId, peer, userId, name, text: clean,
      messageId: event.message_id,
      prompt: `${name}：${clean}\n（这条没有点名你，你想接就接，不想接就只回一个 SKIP。）`,
      skipOnSilence: true,
    }))
  }

  async function reply({ kind, target, peer, name, text, messageId, prompt = '', skipOnSilence = false }) {
    if (settings.limits?.dailyEnabled !== false) {
      const day = limiter.dailyPeek(settings.limits?.dailyReplies)
      if (!day.ok) { trace(`今日总量到顶（${day.used}），跳过 ${peer}`); return }
    }

    trace(`recv ${kind} ${target} ${name}：${text.slice(0, 120)}`)

    // 先把这个会话的 agent 和场景上下文准备好，再决定要不要在正文里补摘要
    transcript.markPending(peer, messageId)
    let prep = null
    try {
      prep = await bridge.prepare(peer)
    } catch (err) {
      trace(`prepare failed ${peer}: ${err?.message || err}`)
    }
    const preface = prep?.scene
      ? ''
      : transcript.digest(peer, { limit: 6, maxChars: 400, title: kind === 'group' ? '群聊' : '私聊' })

    // 工具面：挂在这个会话的 agent 上。挂不上就退回自动转发——不能把话吞了。
    let toolReady = false
    if (settings.tools?.enabled !== false && prep?.agent) {
      try {
        toolReady = tools.attach(prep.agent, { peer, kind, target })
      } catch (err) {
        trace(`tools attach failed ${peer}: ${err?.message || err}`)
      }
    }

    let content = prompt || text
    if (preface) content = `${preface}\n\n${content}`
    // 上次收尾记的那句，接在这一轮开头
    const closing = tools.closingFor(peer)
    if (closing) content = `${closing}\n\n${content}`
    if (settings.chat?.styleNote !== false && !styled.has(peer)) {
      content = `${settings.chat?.styleNoteText || STYLE_NOTE}\n\n${content}`
      styled.add(peer)
      bridge.markStyled?.(peer, STYLE_VERSION)
    }
    if (toolReady && !toolNoted.has(peer)) {
      content = `${TOOL_NOTE}\n\n${content}`
      toolNoted.add(peer)
    }

    await setTyping(kind, target, true)
    tools.resetTurn()
    let result
    try {
      result = await bridge.ask(peer, content, prep)
    } catch (err) {
      trace(`ask failed ${peer}: ${err?.stack || err?.message || err}`)
      await setTyping(kind, target, false)
      transcript.clearPending(peer)
      return
    } finally {
      transcript.clearPending(peer)
    }
    await setTyping(kind, target, false)

    let out = toPlain(result.text)
    if (skipOnSilence && /^SKIP$/i.test(out.replace(/[。．.!！\s]/g, ''))) {
      trace(`插话放弃 ${peer}`)
      return
    }

    // 工具模式：话已经在工具里发出去了，文本输出不再转发
    if (toolReady) {
      const sends = tools.turnSends()
      if (sends > 0) { trace(`turn ${peer} 工具发言 ${sends} 条，文本不转发`); return }
      if (!out) { trace(`turn ${peer} 没调工具也没输出`); return }
      if (settings.tools?.fallbackOnSilent === false) {
        // 「说了才算」的严格版：没调工具就是没说。日志里留证据，方便查模型有没有学会。
        trace(`silent-turn ${peer} 未调工具，按配置不转发：${JSON.stringify(out.slice(0, 60))}`)
        return
      }
      // 兜底版：宁可多发一句，也别让阿晚以为哑了。观察几天再关。
      trace(`silent-turn ${peer} 未调工具，补发 ${out.length} 字（fallbackOnSilent）`)
    }

    if (!out) out = result.error ? `（没答上来：${result.error.message}）` : '（这一轮没有文字输出）'
    trace(`reply ${peer} kind=${result.kind} len=${out.length}`)

    const chunks = settings.chat?.chunkReply === false
      ? splitText(out, settings.maxReplyChars)
      : splitChat(out, settings.chat?.maxChunks || 3).flatMap((c) => splitText(c, settings.maxReplyChars))

    const sender = bot
    if (!sender) { trace(`reply dropped ${peer}: 桥已停`); return }

    for (let i = 0; i < chunks.length; i += 1) {
      if (i) await sleep(600 + Math.random() * 1000)
      try {
        await sender.sendText({ kind, target, text: chunks[i] })
        transcript.record(peer, { fromSelf: true, name: '我', text: chunks[i] })
      } catch (err) {
        trace(`send failed ${peer}: ${err?.message || err}`)
        break
      }
    }
    writeStatus()
  }

  // 首次自检：不经 QQ，直接问模型一句，结果落 qq.log
  if (settings.selftest) {
    const timer = setTimeout(() => {
      trace('selftest: 开始')
      bridge.ask('selftest', '通道自检：只回一句「通道通了」，不要调用任何工具。')
        .then((result) => trace(`selftest: kind=${result.kind} text=${JSON.stringify(result.text)}${result.error ? ` error=${result.error.message}` : ''}`))
        .catch((err) => trace(`selftest: 失败 ${err?.stack || err?.message || err}`))
    }, 1500)
    ctx.effect(() => () => clearTimeout(timer), 'dsh-xi-qq: selftest')
  }

  // 起桥 + 盯配置 + 心跳
  ctx.effect(() => {
    if (settings.enabled !== false) startBot()
    else writeStatus()

    // 上一轮可能卡在审批或超时上没收尾，起来先把已知会话的回合清掉
    if (settings.unstickOnStart !== false) {
      setTimeout(() => { void bridge.unstickAll() }, 1200)
    }

    let lastMtime = 0
    try { lastMtime = fs.statSync(SETTINGS_PATH).mtimeMs } catch { /* 还没写过 */ }
    const poll = setInterval(() => {
      let mtime = 0
      try { mtime = fs.statSync(SETTINGS_PATH).mtimeMs } catch { return }
      if (mtime === lastMtime) return
      lastMtime = mtime
      try { applySettings() } catch (err) { trace(`applySettings threw ${err.message}`) }
    }, POLL_MS)
    const beat = setInterval(() => writeStatus(), HEARTBEAT_MS)

    return () => {
      clearInterval(poll)
      clearInterval(beat)
      stopBot()
      try { tools.disposeAll() } catch { /* agent 已经跟着会话一起没了 */ }
    }
  }, 'dsh-xi-qq: bridge')

  // 只读状态路由
  const registerStatus = (c) => {
    let face
    try { face = c.get ? c.get('connection') : c.connection } catch { return }
    face = face && face.fetch
    if (!face || typeof face.register !== 'function') return
    try {
      c.effect(() => {
        const off = face.register({
          path: '/api/dsh-xi-qq/state',
          methods: ['POST'],
          requestBody: 'buffered',
          fetch: async () => Response.json({
            version: VERSION,
            connected: !!(bot && bot.isUp()),
            selfId,
            peers: Object.keys(bridge.known).length,
            daily: limiter.dailySnapshot(),
            settings: { ...settings, accessToken: settings.accessToken ? '***' : '' },
          }, { headers: { 'cache-control': 'no-store' } }),
        })
        return () => typeof off === 'function' && off()
      }, 'dsh-xi-qq: status route')
    } catch (err) {
      trace(`status route failed: ${err.message}`)
    }
  }
  try {
    if (ctx.get && ctx.get('connection')) registerStatus(ctx)
    else ctx.inject(['connection'], (c) => registerStatus(c))
  } catch (err) {
    trace(`status route inject failed: ${err.message}`)
  }
}
