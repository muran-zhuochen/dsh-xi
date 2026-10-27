// 假 NapCat：一个只会说一句、并打印所有 action 的 OneBot 11 WS 服务端。
// 用来在没有真协议端时验证「收消息 → 进会话 → 回消息」整条链。
//
// 用法：node tools/fake-napcat.mjs [port] ["要发的话"]
// 需要 ws 包：从 DSH profile 的 node_modules 解析（DSH_PROFILE_DIR 或 ~/.dsh/profiles/<name>）。
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const profileDir = process.env.DSH_PROFILE_DIR
  || path.join(os.homedir(), '.dsh', 'profiles', process.env.DSH_PROFILE || 'desktop')
const require = createRequire(path.join(profileDir, 'package.json'))
const { WebSocketServer } = require('ws')

const port = Number(process.argv[2] || 3999)
const incoming = process.argv[3] || '你好，我在测 QQ 通道，随便回我一句短的就行。'
const selfId = 10001
const userId = 20002

const wss = new WebSocketServer({ port })
console.log(`fake-napcat: ws://127.0.0.1:${port}`)

wss.on('connection', (ws, req) => {
  console.log(`client connected ${req.url}`)
  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }
    console.log('ACTION', JSON.stringify(msg))
    ws.send(JSON.stringify({ status: 'ok', retcode: 0, data: { message_id: Date.now() % 100000 }, echo: msg.echo }))
  })
  ws.on('close', () => console.log('client closed'))
  setTimeout(() => {
    if (ws.readyState !== 1) return
    const event = {
      post_type: 'message',
      message_type: 'private',
      sub_type: 'friend',
      self_id: selfId,
      user_id: userId,
      message_id: Date.now() % 1000000,
      message: [{ type: 'text', data: { text: incoming } }],
      raw_message: incoming,
      time: Math.floor(Date.now() / 1000),
      sender: { user_id: userId, nickname: '阿晚' },
    }
    ws.send(JSON.stringify(event))
    console.log('SENT INCOMING', JSON.stringify(incoming))
  }, 1500)
})
