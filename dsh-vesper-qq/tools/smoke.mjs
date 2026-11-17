// 通道冒烟测试：不需要 DSH、不需要真 QQ。配合 tools/fake-onebot.mjs 用。
//   node tools/smoke.mjs
import { OneBot } from '../lib/onebot.js'

const url = process.env.URL || 'ws://127.0.0.1:3001/'
const origin = url.replace(/^ws/, 'http').replace(/\/$/, '')
const events = []

const bot = new OneBot({
  url,
  token: process.env.TOKEN || '',
  log: (message) => console.log('[bot]', message),
  onEvent: (event) => {
    if (event?.post_type === 'message') events.push(event)
  },
})

const fail = (message) => { console.log(`FAIL ${message}`); bot.stop(); process.exit(1) }

bot.start()
if (!(await bot.ready(5000))) fail(`连不上 ${url}`)
console.log('PASS 连上')
await new Promise((resolve) => { setTimeout(resolve, 300) })
console.log(`     登录号 ${bot.selfId || '(未知)'}`)

const said = await (await fetch(`${origin}/say?from=20002&text=%E5%9C%A8%E5%90%97`)).json()
if (said.ok !== true) fail(`/say 失败 ${JSON.stringify(said)}`)
await new Promise((resolve) => { setTimeout(resolve, 500) })
if (events.length !== 1) fail(`应该收到 1 条事件，实际 ${events.length}`)
if (events[0].user_id !== 20002) fail('事件里 user_id 不对')
console.log('PASS 收到私信')

const receipt = await bot.call('send_private_msg', { user_id: 20002, message: '在' })
if (!receipt || !receipt.message_id) fail(`发消息没回 message_id：${JSON.stringify(receipt)}`)
const sent = await (await fetch(`${origin}/sent`)).json()
const last = sent.sends.at(-1)
if (!last || last.to !== 20002 || last.message !== '在') fail(`服务端没收到发送：${JSON.stringify(sent.sends)}`)
console.log('PASS 发消息到达服务端')

bot.stop()
console.log('全通。')
