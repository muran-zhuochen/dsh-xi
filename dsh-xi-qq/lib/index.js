import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { OneBot } from './onebot.js'

export const name = 'dsh-xi-qq'
export const inject = ['tools', 'systemPrompt', 'sessionController']

const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')

const DEFAULTS = {
  onebotUrl: 'ws://127.0.0.1:3001/',
  accessToken: '',
  ownerUin: '',
  sessionId: '',
  dryRun: true,
  replyMaxLines: 6,
  gapMs: 800,
  maxInboundChars: 2000,
  logFile: '',
  configFile: '',
}

const MEDIA_LABEL = {
  image: '图片',
  face: '表情',
  mface: '表情',
  record: '语音',
  video: '视频',
  file: '文件',
  forward: '聊天记录',
  json: '卡片',
  xml: '卡片',
  poke: '戳一戳',
  reply: '',
}

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })
const textBlock = (value) => [{ type: 'text', text: value }]

function resolveConfig(raw) {
  const config = { ...DEFAULTS, ...(raw || {}) }
  config.onebotUrl = String(config.onebotUrl || DEFAULTS.onebotUrl)
  config.accessToken = String(config.accessToken || '')
  config.ownerUin = String(config.ownerUin || '').trim()
  config.sessionId = String(config.sessionId || '')
  config.dryRun = config.dryRun !== false
  config.replyMaxLines = Math.max(1, Math.min(20, Number(config.replyMaxLines) || DEFAULTS.replyMaxLines))
  config.gapMs = Math.max(0, Math.min(5000, Number(config.gapMs) || DEFAULTS.gapMs))
  config.maxInboundChars = Math.max(100, Math.min(8000, Number(config.maxInboundChars) || DEFAULTS.maxInboundChars))
  config.logFile = String(config.logFile || path.join(DSH_HOME, 'xi-qq.log'))
  config.configFile = String(config.configFile || path.join(DSH_HOME, 'xi-qq.json'))
  return config
}

/** 一条 OneBot 消息（段数组或 CQ 字符串）压成一行人类可读的字。 */
function segmentsToText(message) {
  if (Array.isArray(message)) {
    return message.map((segment) => {
      const type = String(segment?.type || '')
      const data = segment?.data || {}
      if (type === 'text') return String(data.text ?? '')
      if (type === 'at') return `@${data.name ?? data.qq ?? ''}`
      if (type === 'reply') return ''
      return `[${MEDIA_LABEL[type] ?? type}]`
    }).join('').trim()
  }
  return String(message ?? '')
    .replace(/\[CQ:(\w+)(?:,[^\]]*)?\]/g, (_match, type) => `[${MEDIA_LABEL[type] ?? type}]`)
    .trim()
}

/** 她写的东西按行拆成多条，跟 QQ 那边的规矩一致：一行 = 一条消息。 */
function splitLines(value, maxLines) {
  const lines = String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !/^[-*_—=]{2,}$/.test(line))
  return lines.slice(0, maxLines)
}

export function apply(ctx, rawConfig) {
  const baseConfig = { ...(rawConfig || {}) }
  const configFile = String(baseConfig.configFile || path.join(DSH_HOME, 'xi-qq.json'))
  let config = resolveConfig(baseConfig)
  const state = {
    lastEventAt: 0,
    lastError: '',
    inbound: [],
    delivered: 0,
    seen: new Map(),
  }

  const trace = (message) => {
    try {
      fs.mkdirSync(path.dirname(config.logFile), { recursive: true })
      fs.appendFileSync(config.logFile, `${new Date().toISOString()} ${message}\n`)
    } catch {
      // 日志写不了不影响通道本身
    }
  }

  const onebot = new OneBot({
    url: config.onebotUrl,
    token: config.accessToken,
    log: (message) => trace(`[onebot] ${message}`),
    onEvent: (event) => { void handleEvent(event) },
  })

  // 热配置：~/.dsh/xi-qq.json 盖在 patch 的 config 之上。每次收消息、每次重连都重读，
  // 换主人号、换 token、开关 dryRun 都不用重启 DSH。
  const refresh = () => {
    let overrides = {}
    try {
      const parsed = JSON.parse(fs.readFileSync(configFile, 'utf8'))
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) overrides = parsed
    } catch {
      // 没有覆盖文件，就照 patch 里的走
    }
    config = resolveConfig({ ...baseConfig, ...overrides })
    onebot.url = config.onebotUrl
    onebot.token = config.accessToken
    return config
  }
  refresh()
  onebot.beforeConnect = refresh

  async function pickSessionId() {
    if (config.sessionId !== '') return config.sessionId
    const controller = new AbortController()
    try {
      const value = await ctx.sessionController.list({}, controller.signal)
      const items = (value?.items || []).filter((item) => (
        item?.origin !== 'subagent'
        && item?.blank !== true
        && item?.agentAvailable !== false
      ))
      items.sort((a, b) => Number(b?.updatedAt ?? 0) - Number(a?.updatedAt ?? 0))
      return String(items[0]?.sessionId ?? '')
    } catch (err) {
      trace(`列会话失败 ${err?.message || err}`)
      return ''
    }
  }

  async function deliver(body, event) {
    const sessionId = await pickSessionId()
    if (sessionId === '') {
      trace('投递失败：没有可用的会话')
      return false
    }
    const nickname = String(event?.sender?.nickname || '阿晚')
    const line = body.length > config.maxInboundChars ? `${body.slice(0, config.maxInboundChars)}…` : body
    const controller = new AbortController()
    try {
      await ctx.sessionController.prompt({
        requestId: `qq-${event?.message_id ?? Date.now()}`,
        sessionId,
        mode: 'queue',
        content: textBlock(`[QQ 私信] ${nickname}：\n${line}`),
        clientTimeZone: 'Asia/Shanghai',
      }, controller.signal)
      state.delivered += 1
      trace(`已投递到 ${sessionId}`)
      return true
    } catch (err) {
      state.lastError = String(err?.message || err)
      trace(`投递失败 ${state.lastError}`)
      return false
    }
  }

  async function handleEvent(event) {
    refresh()
    state.lastEventAt = Date.now()
    if (event?.post_type !== 'message') return
    if (event?.message_type !== 'private') {
      trace(`忽略非私信：${event?.message_type ?? '未知'}`)
      return
    }
    const uin = String(event?.user_id ?? '')
    if (config.ownerUin === '') {
      trace(`收到 ${uin} 的私信，但还没配主人 QQ 号，丢弃`)
      return
    }
    if (uin !== config.ownerUin) {
      trace(`忽略非主人 ${uin}`)
      return
    }
    const id = String(event?.message_id ?? '')
    if (id !== '' && state.seen.has(id)) return
    const body = segmentsToText(event?.message ?? event?.raw_message)
    if (body === '') return
    if (id !== '') {
      state.seen.set(id, Date.now())
      if (state.seen.size > 200) {
        const oldest = state.seen.keys().next().value
        state.seen.delete(oldest)
      }
    }
    state.inbound.push({ time: Date.now(), uin, text: body })
    if (state.inbound.length > 50) state.inbound.shift()
    trace(`收到 ${uin}：${body.slice(0, 80)}`)
    if (config.dryRun) {
      trace('dryRun 开着：只记日志，不投递')
      return
    }
    await deliver(body, event)
  }

  async function sendLines(args) {
    const uin = String(args?.uin ?? config.ownerUin).trim()
    if (uin === '' || !/^\d+$/.test(uin)) return { ok: false, error: '没有可用的 QQ 号：既没传 uin，也没配主人 QQ 号' }
    if (!onebot.isOpen()) return { ok: false, error: `没连上 OneBot（${onebot.state}）${onebot.lastError ? `：${onebot.lastError}` : ''}` }
    const lines = splitLines(args?.text, config.replyMaxLines)
    if (lines.length === 0) return { ok: false, error: '没有内容可发' }
    const sent = []
    for (let index = 0; index < lines.length; index += 1) {
      if (index > 0 && config.gapMs > 0) await sleep(config.gapMs)
      try {
        const result = await onebot.call('send_private_msg', {
          user_id: Number(uin),
          message: lines[index],
          auto_escape: false,
        })
        sent.push({ line: lines[index], messageId: String(result?.message_id ?? '') })
      } catch (err) {
        trace(`发送失败 ${err?.message || err}`)
        return { ok: false, to: uin, sent, error: `第 ${index + 1} 条没发出去：${err?.message || err}` }
      }
    }
    trace(`发出 ${sent.length} 条到 ${uin}`)
    return { ok: true, to: uin, sent }
  }

  const sendTool = {
    name: 'qq_send',
    description: '往阿晚的 QQ 发私信。一行一条，发成几条独立消息（最多 6 条）；短句，别写成公函。',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '要发的话，一行一条。空行和分隔线会被丢掉。' },
        uin: { type: 'string', description: '发给谁；不填就是主人（阿晚）。' },
      },
      required: ['text'],
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          to: { type: 'string' },
          sent: {
            type: 'array',
            items: {
              type: 'object',
              properties: { line: { type: 'string' }, messageId: { type: 'string' } },
              required: ['line', 'messageId'],
            },
          },
          error: { type: 'string' },
        },
        required: ['ok'],
      },
      render: (_args, value) => {
        if (value.ok !== true) {
          const tail = Array.isArray(value.sent) && value.sent.length > 0
            ? `（前 ${value.sent.length} 条已经发出去了）`
            : ''
          return textBlock(`没发出去：${value.error ?? '未知原因'}${tail}`)
        }
        const lines = value.sent.map((item, index) => `${index + 1}. ${item.line}`)
        return textBlock(`发给 ${value.to}，${value.sent.length} 条：\n${lines.join('\n')}`)
      },
    },
    execute: async (args) => sendLines(args ?? {}),
  }

  const statusTool = {
    name: 'qq_status',
    description: '看一眼 QQ 通道：连上没有、登录的是哪个号、最近收到过什么、投递了几条。',
    parameters: { type: 'object', properties: {} },
    output: {
      schema: {
        type: 'object',
        properties: {
          connected: { type: 'boolean' },
          state: { type: 'string' },
          url: { type: 'string' },
          selfId: { type: 'string' },
          ownerUin: { type: 'string' },
          dryRun: { type: 'boolean' },
          session: { type: 'string' },
          lastEventAt: { type: 'number' },
          delivered: { type: 'number' },
          lastError: { type: 'string' },
          inbound: {
            type: 'array',
            items: {
              type: 'object',
              properties: { time: { type: 'number' }, uin: { type: 'string' }, text: { type: 'string' } },
              required: ['time', 'uin', 'text'],
            },
          },
        },
        required: ['connected', 'state', 'url', 'ownerUin', 'dryRun', 'delivered'],
      },
      render: (_args, value) => {
        const head = value.connected
          ? `连着 ${value.url}${value.selfId ? `，登录为 ${value.selfId}` : ''}`
          : `没连上 ${value.url}（${value.state}）`
        const rows = [
          head,
          `主人号：${value.ownerUin || '（还没填）'}`,
          `dryRun：${value.dryRun ? '开（只记日志）' : '关（会投进对话）'}`,
          `投到哪段对话：${value.session || '（取最近活跃的那段）'}`,
          `收到过：${value.lastEventAt > 0 ? new Date(value.lastEventAt).toLocaleString('zh-CN') : '还没'}`,
          `投递过：${value.delivered} 条`,
        ]
        if (value.lastError !== '') rows.push(`最后出错：${value.lastError}`)
        if (value.inbound.length > 0) {
          rows.push('最近几条：')
          for (const item of value.inbound.slice(-5)) {
            rows.push(`- ${new Date(item.time).toLocaleTimeString('zh-CN')} ${item.uin}：${item.text.slice(0, 60)}`)
          }
        }
        return textBlock(rows.join('\n'))
      },
    },
    execute: async () => ({
      connected: onebot.isOpen(),
      state: onebot.state,
      url: config.onebotUrl,
      selfId: onebot.selfId,
      ownerUin: config.ownerUin,
      dryRun: config.dryRun,
      session: config.sessionId,
      lastEventAt: state.lastEventAt,
      delivered: state.delivered,
      lastError: state.lastError || onebot.lastError,
      inbound: state.inbound.slice(-20),
    }),
  }

  ctx.effect(() => {
    const disposers = [sendTool, statusTool].map((tool) => ctx.tools.register(tool))
    return () => { for (const dispose of disposers) { try { dispose?.() } catch { /* 已卸载 */ } } }
  }, 'dsh-xi-qq: 工具')

  ctx.effect(() => {
    onebot.start()
    return () => onebot.stop()
  }, 'dsh-xi-qq: onebot')

  ctx.effect(() => ctx.systemPrompt.section({
    name: 'xi-qq',
    order: 88,
    interpolate: false,
    text: () => {
      if (!onebot.isOpen()) return ''
      return [
        'QQ 私信：阿晚在 QQ 上发来的话会以「[QQ 私信]」开头出现在对话里。',
        '想回就用 qq_send，一行一条，短句，最多六条；不想回就不用回，他不会知道你在看。',
        '别人的 QQ 消息进不来，只有阿晚这一个号。',
      ].join('\n')
    },
  }), 'dsh-xi-qq: 提示')

  trace(`apply 进入：${config.onebotUrl} owner=${config.ownerUin || '(未配)'} dryRun=${config.dryRun}`)
}
