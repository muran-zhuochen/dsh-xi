// 插件逻辑测试：假装自己是 DSH，把 apply 跑起来。不需要 DSH、不需要真 QQ。
//   node tools/plugin-test.mjs
import os from 'node:os'
import path from 'node:path'
import { apply } from '../lib/index.js'

const origin = 'http://127.0.0.1:3001'
const logFile = path.join(os.tmpdir(), `xi-qq-test-${Date.now()}.log`)
const prompts = []
const tools = new Map()

const ctx = {
  effect: (fn) => fn(),
  tools: { register: (tool) => { tools.set(tool.name, tool); return () => {} } },
  systemPrompt: { section: () => () => {} },
  sessionController: {
    list: async () => ({ items: [{ sessionId: 'test-session', updatedAt: 5, blank: false }] }),
    prompt: async (request) => { prompts.push(request); return { accepted: true } },
  },
}

const fail = (message) => { console.log(`FAIL ${message}`); process.exit(1) }
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

apply(ctx, {
  onebotUrl: 'ws://127.0.0.1:3001/',
  ownerUin: '20002',
  dryRun: false,
  gapMs: 0,
  logFile,
})

await wait(800)
if (!tools.has('qq_send') || !tools.has('qq_status')) fail('工具没注册上')
console.log('PASS 工具注册：qq_send / qq_status')

await fetch(`${origin}/say?from=20002&text=%E5%9C%A8%E5%90%97`)
await wait(400)
if (prompts.length !== 1) fail(`应该投递 1 次，实际 ${prompts.length}`)
if (prompts[0].sessionId !== 'test-session') fail(`投到 ${prompts[0].sessionId}`)
if (!prompts[0].content[0].text.startsWith('[QQ 私信]')) fail(`内容不对：${prompts[0].content[0].text}`)
if (prompts[0].mode !== 'queue') fail(`mode 是 ${prompts[0].mode}`)
console.log(`PASS 投递：${JSON.stringify(prompts[0].content[0].text)}`)

await fetch(`${origin}/say?from=30003&text=%E4%B8%8D%E6%98%AF%E4%B8%BB%E4%BA%BA`)
await wait(400)
if (prompts.length !== 1) fail(`非主人的消息不该投递，实际 ${prompts.length} 次`)
console.log('PASS 非主人消息被挡')

const result = await tools.get('qq_send').execute({ text: '在\n\n在的\n---' })
if (result.ok !== true) fail(`qq_send 失败：${JSON.stringify(result)}`)
if (result.sent.length !== 2) fail(`应该拆成 2 条，实际 ${result.sent.length}`)
const sent = await (await fetch(`${origin}/sent`)).json()
const tail = sent.sends.slice(-2).map((item) => item.message)
if (tail.join('|') !== '在|在的') fail(`服务端收到的是 ${JSON.stringify(tail)}`)
console.log(`PASS 拆行发送：${JSON.stringify(tail)}`)

const status = await tools.get('qq_status').execute({})
if (status.connected !== true || status.delivered !== 1) fail(`状态不对：${JSON.stringify(status)}`)
console.log('PASS 状态查询')

console.log(`日志：${logFile}`)
process.exit(0)
