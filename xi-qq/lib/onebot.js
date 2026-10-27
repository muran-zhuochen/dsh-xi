// 极简 OneBot 11 反向 WS 客户端：收事件、发 action，断线自动重连。
// 只用 Node 内建 WebSocket（Electron 44 / Node 22+ 自带），不引额外依赖。

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function createOneBot({ url, token, onEvent, onState, trace }) {
  let ws = null
  let stopped = false
  let attempt = 0
  let wasOpen = false
  let retryTimer = null
  let seq = 0
  const pending = new Map()

  const ready = () => ws && ws.readyState === 1

  function scheduleReconnect() {
    if (stopped || retryTimer) return
    const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(attempt, 4)))
    attempt += 1
    if (attempt === 1 || attempt % 5 === 0) trace(`onebot: ${delay}ms 后重连（第 ${attempt} 次）`)
    retryTimer = setTimeout(() => { retryTimer = null; connect() }, delay)
  }

  function connect() {
    if (stopped) return
    let target
    try {
      const u = new URL(url)
      if (token) u.searchParams.set('access_token', token)
      target = u.toString()
    } catch (err) {
      trace(`onebot: bad url ${url} — ${err.message}`)
      return
    }
    try {
      ws = new WebSocket(target)
    } catch (err) {
      trace(`onebot: construct failed — ${err.message}`)
      scheduleReconnect()
      return
    }

    ws.addEventListener('open', () => {
      attempt = 0
      wasOpen = true
      trace(`onebot: 已连接 ${url}`)
      try { onState?.('open') } catch { /* 状态回调失败不影响收发 */ }
    })
    ws.addEventListener('message', (ev) => {
      let data
      try { data = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data)) } catch { return }
      if (data && data.echo !== undefined && data.echo !== null) {
        const slot = pending.get(String(data.echo))
        if (!slot) return
        pending.delete(String(data.echo))
        if (data.status === 'failed' || data.retcode) slot.reject(new Error(`onebot ${data.retcode ?? ''} ${data.wording || data.message || 'action failed'}`.trim()))
        else slot.resolve(data.data)
        return
      }
      if (data && data.post_type === 'message') {
        try { onEvent(data) } catch (err) { trace(`onebot: handler threw — ${err.message}`) }
      }
    })
    ws.addEventListener('close', (ev) => {
      if (wasOpen) trace(`onebot: 连接断开 ${ev.code ?? ''} ${ev.reason ?? ''}`.trim())
      wasOpen = false
      ws = null
      try { onState?.('close') } catch { /* 同上 */ }
      scheduleReconnect()
    })
    ws.addEventListener('error', () => { /* close 事件里统一处理，避免每次重连刷两行 */ })
  }

  async function call(action, params = {}, timeoutMs = 20000) {
    if (!ready()) throw new Error('onebot not connected')
    const echo = String(++seq)
    const payload = JSON.stringify({ action, params, echo })
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(echo)
        reject(new Error(`onebot ${action} timeout`))
      }, timeoutMs)
      pending.set(echo, {
        resolve: (v) => { clearTimeout(timer); resolve(v) },
        reject: (e) => { clearTimeout(timer); reject(e) },
      })
      try { ws.send(payload) } catch (err) {
        clearTimeout(timer)
        pending.delete(echo)
        reject(err)
      }
    })
  }

  async function sendText({ kind, target, text }) {
    const action = kind === 'group' ? 'send_group_msg' : 'send_private_msg'
    const params = kind === 'group' ? { group_id: Number(target), message: text } : { user_id: Number(target), message: text }
    await call(action, params)
  }

  return {
    start() { stopped = false; connect() },
    stop() {
      stopped = true
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
      try { ws?.close() } catch { /* ignore */ }
      ws = null
      for (const [, slot] of pending) slot.reject(new Error('onebot stopped'))
      pending.clear()
    },
    isUp: ready,
    call,
    sendText,
    sleep,
  }
}
