// 汐 · QQ 接入（宿主半侧）
// QQ(手机/PC) ←→ NapCat / OneBot 11 ←→ 本插件 ←→ DSH 会话 ←→ 汐
//
// 配置在 ~/.dsh/xi-qq/settings.json，改文件即时生效（每 2 秒看一次 mtime），
// 「汐」控制台的开关和频率也都写这个文件。
import fs from 'node:fs'
import { createOneBot } from './onebot.js'
import { createBridge } from './bridge.js'
import { loadSettings, log, readJson, SETTINGS_PATH, STATUS_PATH, writeJson } from './settings.js'
import { extractText, isAtSelf, toPlain, splitText, splitChat } from './text.js'
import { createLimiter } from './rate.js'

export const name = 'dsh-xi-qq'

const VERSION = '0.2.0'
const POLL_MS = 2000
const HEARTBEAT_MS = 30000
const DIGEST_MAX = 6
const STYLE_NOTE = '（QQ 通道说明）以后在这个会话里按聊天的方式说话：短句、口语，不用 markdown 和列表，一般一两句说完。能贫、能反对、能拐弯，别写成报告。'

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

  const bridge = createBridge({ getService, getSettings: () => settings, trace })
  const limiter = createLimiter()
  const styled = new Set(Object.keys(bridge.known).filter((k) => bridge.known[k]?.styleSent))
  const recent = new Map() // groupId -> [{name, text, at}]
  const typingOk = { private: true, group: true }

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
    trace(`settings: enabled=${next.enabled} private=${next.privateChat?.enabled} groups=${next.groupPolicy?.enabled}`)
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

  function pushRecent(groupId, name, text) {
    const list = recent.get(groupId) || []
    list.push({ name, text: String(text).slice(0, 80), at: Date.now() })
    while (list.length > DIGEST_MAX) list.shift()
    recent.set(groupId, list)
  }

  function digestFor(groupId) {
    const list = (recent.get(groupId) || []).slice(0, -1) // 最后一条就是触发这句，正文里已有
    if (list.length < 2) return ''
    return '最近群聊：\n' + list.map((x) => `${x.name}：${x.text}`).join('\n')
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
      if (settings.allowUsers.length && !settings.allowUsers.includes(userId)) {
        trace(`skip private ${userId}：不在 allowUsers`)
        return
      }
      const gate = limiter.allow(`private:${userId}`, settings.privateChat || {})
      if (!gate.ok) { trace(`private ${userId} 限流（${gate.reason}）`); return }
      enqueue(`private:${userId}`, () => reply({
        kind: 'private', target: userId, peer: `private:${userId}`, userId, name, text,
      }))
      return
    }

    if (type !== 'group') return
    const groupId = String(event.group_id || '')
    if (!settings.groups.includes(groupId)) return
    if (settings.groupPolicy?.enabled === false) return

    const mentioned = isAtSelf(event.message, selfId)
    const clean = selfId ? text.replaceAll(`@${selfId}`, '').trim() : text
    if (!clean) return
    pushRecent(groupId, name, clean)

    const policy = settings.groupPolicy || {}
    const peer = `group:${groupId}`

    if (mentioned) {
      const mention = policy.mention || {}
      if (mention.enabled === false) return
      const gate = limiter.allow(`group:${groupId}:mention`, mention)
      if (!gate.ok) { trace(`group ${groupId} @ 限流（${gate.reason}）`); return }
      enqueue(peer, () => reply({
        kind: 'group', target: groupId, peer, userId, name, text: clean,
        preface: digestFor(groupId), prompt: `${name}：${clean}`,
      }))
      return
    }

    // 没被 @：主动插话，四道闸
    const ambient = policy.ambient || {}
    if (!ambient.enabled) return
    const keys = (ambient.keywords || []).filter(Boolean)
    const hitKeyword = keys.some((k) => clean.includes(k))
    const hitQuestion = /[?？]/.test(clean) || /吗|呢|怎么|为什么|谁|哪个/.test(clean)
    if (!hitKeyword && !hitQuestion) return
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
      preface: digestFor(groupId),
      prompt: `${name}：${clean}\n（这条没有点名你，你想接就接，不想接就只回一个 SKIP。）`,
      skipOnSilence: true,
    }))
  }

  async function reply({ kind, target, peer, name, text, preface = '', prompt = '', skipOnSilence = false }) {
    if (settings.limits?.dailyEnabled !== false) {
      const day = limiter.dailyAllow(settings.limits?.dailyReplies)
      if (!day.ok) { trace(`今日总量到顶（${day.used}），跳过 ${peer}`); return }
    }

    trace(`recv ${kind} ${target} ${name}：${text.slice(0, 120)}`)

    let content = prompt || text
    if (preface) content = `${preface}\n\n${content}`
    if (settings.chat?.styleNote !== false && !styled.has(peer)) {
      content = `${STYLE_NOTE}\n\n${content}`
      styled.add(peer)
      bridge.markStyled?.(peer)
    }

    await setTyping(kind, target, true)
    let result
    try {
      result = await bridge.ask(peer, content)
    } catch (err) {
      trace(`ask failed ${peer}: ${err?.stack || err?.message || err}`)
      await setTyping(kind, target, false)
      return
    }
    await setTyping(kind, target, false)

    let out = toPlain(result.text)
    if (skipOnSilence && /^SKIP$/i.test(out.replace(/[。．.!！\s]/g, ''))) {
      trace(`插话放弃 ${peer}`)
      return
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
