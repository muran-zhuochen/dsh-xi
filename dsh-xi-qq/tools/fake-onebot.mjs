// 假的 OneBot v11 服务端 —— 只为在没装 OpenQQ、还没有 QQ 号的时候验证通道本身。
// 不引第三方包：握手、帧、鉴权全手写，够这个小用途。
//
//   node tools/fake-onebot.mjs                 # 监听 ws://127.0.0.1:3001/
//   TOKEN=abc node tools/fake-onebot.mjs       # 带 access_token 校验
//
//   curl "http://127.0.0.1:3001/say?from=20002&text=在吗"   # 假装主人发来一条私信
//   curl "http://127.0.0.1:3001/sent"                        # 看插件发出去的 action

import http from 'node:http'
import crypto from 'node:crypto'

const PORT = Number(process.env.PORT || 3001)
const TOKEN = process.env.TOKEN || ''
const SELF_ID = Number(process.env.SELF_ID || 10001)

const clients = new Set()
const sends = []
let nextMessageId = 1000

function frame(payload, opcode = 1) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8')
  const length = data.length
  let header
  if (length < 126) {
    header = Buffer.alloc(2)
    header[1] = length
  } else if (length < 65536) {
    header = Buffer.alloc(4)
    header[1] = 126
    header.writeUInt16BE(length, 2)
  } else {
    header = Buffer.alloc(10)
    header[1] = 127
    header.writeBigUInt64BE(BigInt(length), 2)
  }
  header[0] = 0x80 | opcode
  return Buffer.concat([header, data])
}

function broadcast(object) {
  const payload = frame(JSON.stringify(object))
  for (const client of clients) {
    try { client.socket.write(payload) } catch { clients.delete(client) }
  }
}

function event(from, text) {
  nextMessageId += 1
  return {
    post_type: 'message',
    message_type: 'private',
    sub_type: 'friend',
    self_id: SELF_ID,
    user_id: from,
    message: [{ type: 'text', data: { text } }],
    raw_message: text,
    font: 0,
    sender: { user_id: from, nickname: '测试主人' },
    message_id: nextMessageId,
    time: Math.floor(Date.now() / 1000),
  }
}

function onAction(client, raw) {
  let request
  try { request = JSON.parse(raw) } catch { return }
  const { action, params = {}, echo } = request ?? {}
  if (action === 'get_login_info') {
    client.socket.write(frame(JSON.stringify({ status: 'ok', retcode: 0, data: { user_id: SELF_ID, nickname: 'fake-bot' }, echo })))
    return
  }
  if (action === 'send_private_msg') {
    sends.push({ to: params.user_id, message: params.message, at: Date.now() })
    console.log(`[fake] send_private_msg → ${params.user_id}: ${params.message}`)
    client.socket.write(frame(JSON.stringify({ status: 'ok', retcode: 0, data: { message_id: nextMessageId += 1 }, echo })))
    return
  }
  client.socket.write(frame(JSON.stringify({ status: 'failed', retcode: 1404, wording: `不支持的 action ${action}`, echo })))
}

function drain(client) {
  for (;;) {
    const buffer = client.buffer
    if (buffer.length < 2) return
    const opcode = buffer[0] & 0x0f
    const masked = (buffer[1] & 0x80) !== 0
    let length = buffer[1] & 0x7f
    let offset = 2
    if (length === 126) {
      if (buffer.length < 4) return
      length = buffer.readUInt16BE(2)
      offset = 4
    } else if (length === 127) {
      if (buffer.length < 10) return
      length = Number(buffer.readBigUInt64BE(2))
      offset = 10
    }
    const maskLength = masked ? 4 : 0
    if (buffer.length < offset + maskLength + length) return
    const mask = masked ? buffer.subarray(offset, offset + 4) : null
    const payload = Buffer.from(buffer.subarray(offset + maskLength, offset + maskLength + length))
    if (mask) for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i % 4]
    client.buffer = buffer.subarray(offset + maskLength + length)
    if (opcode === 8) { client.socket.end(); return }
    if (opcode === 9) { client.socket.write(frame(payload, 10)); continue }
    if (opcode === 1) onAction(client, payload.toString('utf8'))
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/say') {
    const from = Number(url.searchParams.get('from') || 0)
    const text = url.searchParams.get('text') || ''
    if (from === 0 || text === '') {
      res.writeHead(400, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'from 和 text 都要有' }))
      return
    }
    broadcast(event(from, text))
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, clients: clients.size }))
    return
  }
  if (url.pathname === '/sent') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ clients: clients.size, sends }))
    return
  }
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
  res.end('fake onebot v11\n')
})

server.on('upgrade', (req, socket) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  const given = url.searchParams.get('access_token') || ''
  if (TOKEN !== '' && given !== TOKEN) {
    socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n')
    return
  }
  const key = req.headers['sec-websocket-key']
  if (typeof key !== 'string') {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
    return
  }
  const accept = crypto.createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64')
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '',
    '',
  ].join('\r\n'))
  const client = { socket, buffer: Buffer.alloc(0) }
  clients.add(client)
  console.log(`[fake] 客户端连上，共 ${clients.size} 个`)
  socket.on('data', (chunk) => {
    client.buffer = Buffer.concat([client.buffer, chunk])
    drain(client)
  })
  socket.on('close', () => { clients.delete(client); console.log('[fake] 客户端断开') })
  socket.on('error', () => { clients.delete(client) })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[fake] ws://127.0.0.1:${PORT}/  token=${TOKEN === '' ? '(不校验)' : TOKEN}`)
})
