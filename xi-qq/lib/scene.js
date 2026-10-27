// 场景上下文：把这个 QQ 会话的「群里刚才什么样」挂到它的提示词里。
//
// 挂法是 agent 作用域，不是全局——只在那一轮 QQ 会话里出现，
// 阿晚在网页里跟我说话时，提示词里不会有任何 QQ 内容。
import { createTranscript } from './transcript.js'

const CONTEXT_NAME = 'qq-scene'
// 标准运行时上下文的 order 到 210（WEB_SURFACE）；排在它们后面就够了
const CONTEXT_ORDER = 300
const LOG_THROTTLE_MS = 5000

export function createScenes({ trace = () => {}, getSettings = () => ({}), transcript }) {
  const store = transcript || createTranscript({ trace })
  const attached = new Map() // sessionId -> { agent, peer, dispose }
  const lastLog = new Map()

  function sceneTitle(peer) {
    return String(peer).startsWith('private:') ? '私聊' : '群聊'
  }

  function renderFor(peer) {
    const scene = (getSettings() || {}).scene || {}
    if (scene.enabled === false) return ''
    return store.render(peer, {
      limit: Number(scene.maxMessages) || 20,
      maxChars: Number(scene.maxChars) || 800,
      title: sceneTitle(peer),
    })
  }

  function detach(sessionId) {
    const prev = attached.get(sessionId)
    if (!prev) return
    attached.delete(sessionId)
    try { prev.dispose?.() } catch { /* 上下文已经跟着 agent 一起没了 */ }
  }

  /**
   * 把 peer 的群聊近况挂到这个 agent 的提示词上。
   * 同一个 agent + 同一个 peer 只挂一次；agent 换了（重启/退役）自动重挂。
   * @returns {boolean} 挂上了没有——没挂上时调用方退回正文摘要。
   */
  function attach(agent, peer) {
    const sessionId = agent && agent.id
    if (!sessionId || !peer) return false
    const prev = attached.get(sessionId)
    if (prev && prev.agent === agent && prev.peer === peer) return true
    if (prev) detach(sessionId)

    const ctx = agent.ctx
    const prompt = ctx && (typeof ctx.get === 'function' ? ctx.get('systemPrompt') : ctx.systemPrompt)
    if (!prompt || typeof prompt.context !== 'function') {
      trace(`scene: ${sessionId} 拿不到 systemPrompt，退回正文摘要`)
      return false
    }

    let dispose
    try {
      dispose = prompt.context({
        name: CONTEXT_NAME,
        order: CONTEXT_ORDER,
        text: () => {
          const text = renderFor(peer)
          if (text) {
            const now = Date.now()
            const key = `${sessionId}|${peer}`
            if (!lastLog.has(key) || now - lastLog.get(key) > LOG_THROTTLE_MS) {
              lastLog.set(key, now)
              trace(`scene render ${sessionId} peer=${peer} chars=${text.length}`)
            }
          }
          return text
        },
      })
    } catch (err) {
      trace(`scene: 注册失败 ${sessionId} — ${err.message}`)
      return false
    }

    attached.set(sessionId, { agent, peer, dispose })
    trace(`scene: 已挂 ${sessionId} ← ${peer}`)
    return true
  }

  function isAttached(peer) {
    for (const entry of attached.values()) if (entry.peer === peer) return true
    return false
  }

  function disposeAll() {
    for (const id of [...attached.keys()]) detach(id)
  }

  return { attach, detach, isAttached, disposeAll, renderFor, store }
}
