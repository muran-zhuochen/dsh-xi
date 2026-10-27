// 会话桥：QQ 对端 → 一个 DSH 会话。发 prompt、等 turn/end、取回复文本。
import crypto from 'node:crypto'
import { SESSIONS_PATH, readJson, writeJson } from './settings.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const tz = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai' } catch { return 'Asia/Shanghai' }
})()

function textOf(event) {
  const content = event?.data?.message?.content
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''
  return content
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim()
}

export function createBridge({ getService, getSettings, trace }) {
  const sessions = readJson(SESSIONS_PATH, {})
  let dirty = false
  let flushTimer = null

  const persist = () => {
    dirty = true
    if (flushTimer) return
    flushTimer = setTimeout(() => {
      flushTimer = null
      if (!dirty) return
      dirty = false
      writeJson(SESSIONS_PATH, sessions)
    }, 800)
  }

  const service = () => {
    const sc = getService('sessionController')
    if (!sc) throw new Error('sessionController 不可用')
    return sc
  }

  async function lastSeq(sc, sessionId) {
    try {
      const state = await sc.inspect(sessionId)
      const events = state?.events || []
      return events.reduce((max, e) => (Number(e.seq) > max ? Number(e.seq) : max), 0)
    } catch {
      return 0
    }
  }

  async function ensureSession(peer) {
    const known = sessions[peer]
    if (known && known.sessionId) return known.sessionId
    const settings = getSettings()
    const request = {}
    if (settings.cwd) request.cwd = settings.cwd
    if (settings.agentPreset) request.agentPreset = settings.agentPreset
    const created = await service().create(request)
    const sessionId = created.sessionId
    sessions[peer] = { sessionId, at: Date.now() }
    persist()
    trace(`bridge: 新建会话 ${peer} -> ${sessionId}${created.agentPreset ? ` (preset=${created.agentPreset})` : ''}`)
    return sessionId
  }

  function forget(peer) {
    delete sessions[peer]
    persist()
  }

  /** 记下「这个会话已经说过哪一版说话风格」，免得每轮都重复。 */
  function markStyled(peer, version = 1) {
    const rec = sessions[peer]
    if (!rec) return
    if (rec.styleSent && rec.styleVersion === version) return
    rec.styleSent = true
    rec.styleVersion = version
    persist()
  }

  const policySet = new Set()

  /** QQ 会话不该卡在审批上：默认把该 agent 的策略钉成 never（工具直接被拒，不等人）。 */
  async function ensurePolicy(sessionId) {
    const approval = getService('approval')
    if (!approval?.setPolicy || policySet.has(sessionId)) return
    const wanted = getSettings().approvalPolicy || 'never'
    try {
      const resolved = await service().resolveAgent(sessionId)
      if (resolved?.agent) {
        approval.setPolicy(resolved.agent, wanted)
        policySet.add(sessionId)
        trace(`approval: ${sessionId} -> ${wanted}`)
      }
    } catch (err) {
      trace(`approval set failed ${sessionId}: ${err.message}`)
    }
  }

  /** 打断正在跑（或正卡在审批上）的回合，别让后来的消息一直排队。 */
  async function cancelSession(sessionId) {
    try {
      await service().cancel({ sessionId })
      trace(`cancel: ${sessionId}`)
    } catch (err) {
      trace(`cancel failed ${sessionId}: ${err.message}`)
    }
  }

  /** 插件刚起来时，把已知会话里可能卡住的回合清掉。 */
  async function unstickAll() {
    for (const [peer, rec] of Object.entries(sessions)) {
      if (!rec?.sessionId) continue
      trace(`unstick: ${peer}`)
      await cancelSession(rec.sessionId)
    }
  }

  /**
   * @returns {Promise<{text: string, kind: string, error?: Error}>}
   */
  async function ask(peer, text) {
    const sc = service()
    const settings = getSettings()
    const sessionId = await ensureSession(peer)
    await ensurePolicy(sessionId)
    const baseline = await lastSeq(sc, sessionId)
    trace(`bridge: prompt ${peer} session=${sessionId} base=${baseline} text=${JSON.stringify(text.slice(0, 80))}`)

    const controller = new AbortController()
    const abortTimer = setTimeout(() => controller.abort(), settings.timeoutMs)
    try {
      await sc.prompt({
        requestId: crypto.randomUUID(),
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text }],
        clientTimeZone: tz,
      }, controller.signal)
    } finally {
      clearTimeout(abortTimer)
    }

    const deadline = Date.now() + settings.timeoutMs
    while (Date.now() < deadline) {
      await sleep(600)
      let state
      try {
        state = await sc.inspect(sessionId)
      } catch (err) {
        trace(`bridge: inspect failed — ${err.message}`)
        continue
      }
      const fresh = (state?.events || []).filter((e) => Number(e.seq) > baseline)
      const end = fresh.find((e) => e.type === 'turn/end')
      if (!end) continue
      const reply = fresh.filter((e) => e.type === 'assistant/message').map(textOf).filter(Boolean).join('\n\n').trim()
      const reason = end?.data?.reason
      const kind = reason?.kind || 'completed'
      if (kind === 'error') {
        return { text: reply, kind, error: new Error(reason?.error?.message || '模型报错') }
      }
      return { text: reply, kind }
    }
    // 超时就把这一轮掐掉：否则它会一直挂着，后面的消息全排队等死
    await cancelSession(sessionId)
    return { text: '', kind: 'timeout', error: new Error(`等回复超时（${Math.round(settings.timeoutMs / 1000)}s）`) }
  }
  return { ask, ensureSession, forget, markStyled, cancelSession, unstickAll, known: sessions }
}
