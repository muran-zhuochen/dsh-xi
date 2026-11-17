// OneBot v11 正向 WebSocket 的最小客户端：连上、收事件、发动作、断了自动重连。
// 不引第三方包（Node 22+ 自带 WebSocket）。

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

export class OneBot {
  constructor(options = {}) {
    this.url = String(options.url || '')
    this.token = String(options.token || '')
    this.log = typeof options.log === 'function' ? options.log : () => {}
    this.onEvent = typeof options.onEvent === 'function' ? options.onEvent : () => {}
    this.beforeConnect = typeof options.beforeConnect === 'function' ? options.beforeConnect : () => {}
    this.pending = new Map()
    this.counter = 0
    this.ws = null
    this.state = 'idle' // idle | connecting | open | closed | stopped
    this.attempt = 0
    this.retryTimer = null
    this.stopped = false
    this.selfId = ''
    this.lastError = ''
    this.connectedAt = 0
    this.heartbeat = null
  }

  startHeartbeat() {
    this.stopHeartbeat()
    // OpenQQ 的空闲连接大约 60 秒就会被踢，隔 20 秒打个招呼把它续住
    this.heartbeat = setInterval(() => {
      if (!this.isOpen()) return
      this.call('get_login_info', {}, 5000).catch(() => { /* 心跳失败无所谓 */ })
    }, 20000)
    if (this.heartbeat.unref) this.heartbeat.unref()
  }

  stopHeartbeat() {
    if (this.heartbeat !== null) { clearInterval(this.heartbeat); this.heartbeat = null }
  }

  isOpen() {
    return this.state === 'open'
  }

  endpoint() {
    if (this.token === '') return this.url
    const sep = this.url.includes('?') ? '&' : '?'
    return `${this.url}${sep}access_token=${encodeURIComponent(this.token)}`
  }

  start() {
    this.stopped = false
    this.connect()
    return this
  }

  stop() {
    this.stopped = true
    this.state = 'stopped'
    this.stopHeartbeat()
    if (this.retryTimer !== null) { clearTimeout(this.retryTimer); this.retryTimer = null }
    try { this.ws?.close() } catch { /* 已经关了 */ }
    this.ws = null
    this.failAll('连接已关闭')
  }

  failAll(reason) {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer)
      entry.reject(new Error(reason))
    }
    this.pending.clear()
  }

  scheduleRetry() {
    if (this.stopped) return
    if (this.retryTimer !== null) return
    this.attempt += 1
    // 断线要快点回来：1s、2s、4s，最多 8s。断着的时候消息就是丢了。
    const delay = Math.min(8000, 1000 * 2 ** Math.min(3, this.attempt - 1))
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.connect()
    }, delay)
    if (this.retryTimer.unref) this.retryTimer.unref()
  }

  connect() {
    if (this.stopped) return
    if (typeof WebSocket !== 'function') {
      this.lastError = '这个运行时没有 WebSocket'
      this.log(this.lastError)
      return
    }
    try { this.beforeConnect() } catch { /* 配置刷新失败不该挡连接 */ }
    this.state = 'connecting'
    let ws
    try {
      ws = new WebSocket(this.endpoint())
    } catch (err) {
      this.lastError = String(err?.message || err)
      this.state = 'closed'
      this.log(`连接失败 ${this.lastError}`)
      this.scheduleRetry()
      return
    }
    this.ws = ws

    ws.addEventListener('open', () => {
      if (this.ws !== ws) return
      this.state = 'open'
      this.attempt = 0
      this.connectedAt = Date.now()
      this.lastError = ''
      this.log(`连上 ${this.url}`)
      this.startHeartbeat()
      this.call('get_login_info')
        .then((info) => {
          this.selfId = String(info?.user_id ?? '')
          this.log(`登录为 ${this.selfId || '未知'}`)
        })
        .catch(() => { /* 读不到不影响收发 */ })
    })

    ws.addEventListener('message', (event) => {
      if (this.ws !== ws) return
      this.receive(event?.data)
    })

    ws.addEventListener('error', () => {
      if (this.ws !== ws) return
      this.lastError = 'WebSocket 出错'
    })

    ws.addEventListener('close', () => {
      if (this.ws !== ws) return
      const wasOpen = this.state === 'open'
      this.state = 'closed'
      this.stopHeartbeat()
      this.ws = null
      this.failAll('连接断开')
      if (this.stopped) return
      if (wasOpen) this.log('连接断开')
      this.scheduleRetry()
    })
  }

  receive(data) {
    let payload
    try {
      payload = typeof data === 'string' ? data : Buffer.from(data).toString('utf8')
      payload = JSON.parse(payload)
    } catch {
      return
    }
    if (payload === null || typeof payload !== 'object') return
    if (payload.echo !== undefined && this.pending.has(String(payload.echo))) {
      const echo = String(payload.echo)
      const entry = this.pending.get(echo)
      this.pending.delete(echo)
      clearTimeout(entry.timer)
      if (payload.status === 'failed' || (typeof payload.retcode === 'number' && payload.retcode !== 0)) {
        entry.reject(new Error(`OneBot 返回 ${payload.retcode ?? 'failed'} ${payload.wording || payload.message || ''}`.trim()))
      } else {
        entry.resolve(payload.data)
      }
      return
    }
    try {
      this.onEvent(payload)
    } catch (err) {
      this.log(`事件处理出错 ${err?.message || err}`)
    }
  }

  call(action, params = {}, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      if (!this.isOpen() || this.ws === null) {
        reject(new Error(`没连上 OneBot（${this.state}）`))
        return
      }
      this.counter += 1
      const echo = `e${this.counter}`
      const timer = setTimeout(() => {
        this.pending.delete(echo)
        reject(new Error(`${action} 超时`))
      }, timeoutMs)
      if (timer.unref) timer.unref()
      this.pending.set(echo, { resolve, reject, timer })
      try {
        this.ws.send(JSON.stringify({ action, params, echo }))
      } catch (err) {
        this.pending.delete(echo)
        clearTimeout(timer)
        reject(err)
      }
    })
  }

  async ready(timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs
    while (!this.isOpen() && Date.now() < deadline) await sleep(100)
    return this.isOpen()
  }
}
