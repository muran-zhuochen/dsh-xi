// 工具面离线测试：不联网、不连 QQ，用假 bot 验证注册、发送闸门、等待、收尾。
// 用法：node tools/tools-test.mjs
import { createQqTools } from '../lib/tools.js'
import { createLimiter } from '../lib/rate.js'

const cases = []
const check = (name, ok, detail) => cases.push({ name, ok: !!ok, detail })

const settings = {
  maxReplyChars: 1500,
  chat: { chunkReply: true, maxChunks: 3 },
  limits: { dailyEnabled: false, dailyReplies: 200 },
  tools: { enabled: true, minIntervalSec: 2, maxPerHour: 60 },
}

const sent = []
const transcriptLines = []
const bot = {
  up: true,
  isUp() { return this.up },
  async sendText(p) { sent.push(p) },
}
const transcript = {
  record(peer, rec) { transcriptLines.push({ peer, ...rec }) },
  render() { return '阿晚：在吗\n我：在' },
}
const limiter = createLimiter()

const tools = createQqTools({
  getSettings: () => settings,
  getBot: () => bot,
  limiter,
  transcript,
  trace: () => {},
})

// 假 tools 服务：拿到 register 进来的定义，好直接调 execute
const registry = new Map()
const fakeAgent = { id: 'session-1', ctx: { get: (k) => (k === 'tools' ? { register: (def) => { registry.set(def.name, def); return () => registry.delete(def.name) } } : null) } }

const attached = tools.attach(fakeAgent, { peer: 'private:20002', kind: 'private', target: '20002' })
check('attach 成功', attached === true)
check('注册了 5 个工具', registry.size === 5, [...registry.keys()])

const run = (name, args) => registry.get(name).execute(args)

// 1) 发一条
const r1 = await run('qq_send_message', { text: '在，怎么了？' })
check('send ok', r1.ok === true && r1.sent === 1, r1)
check('真的发出去了', sent.at(-1)?.text === '在，怎么了？', sent.at(-1))
check('记进了转录', transcriptLines.some((l) => l.fromSelf), transcriptLines.length)

// 2) 冷却：紧接着再发应该被拦
const r2 = await run('qq_send_message', { text: '再说一句' })
check('冷却拦截', r2.ok === false && /太快/.test(r2.reason || ''), r2)

// 3) 连发：跳过冷却，但仍记小时桶
sent.length = 0
const r3 = await run('qq_send_burst', { messages: ['一', '二', '三'] })
check('burst 发 3 条', r3.ok === true && r3.sent === 3, r3)
check('burst 三个气泡', sent.length === 3, sent.map((s) => s.text))

// 4) 空消息
const r4 = await run('qq_send_message', { text: '   ' })
check('空消息拒绝', r4.ok === false && /空消息/.test(r4.reason || ''), r4)

// 5) 分条：长文本被切成多条气泡
sent.length = 0
settings.tools.minIntervalSec = 0
const long = '第一句。第二句。第三句。第四句。第五句。第六句。'
const r5 = await run('qq_send_message', { text: long })
check('长文本分条', r5.ok === true && r5.sent >= 2, r5)
settings.tools.minIntervalSec = 2

// 6) 连接断开
bot.up = false
const r6 = await run('qq_send_message', { text: '断线时发' })
check('断线拒发', r6.ok === false && /未连接/.test(r6.reason || ''), r6)
bot.up = true

// 7) 等待：hold 期间来的消息由工具收下
const waiting = run('qq_wait_for_messages', { timeoutMs: 3000 })
await new Promise((r) => setTimeout(r, 30))
check('等待期间在 hold', tools.isHolding('private:20002') === true)
tools.feed('private:20002', { from: '阿晚', text: '那你现在忙吗' })
const w = await waiting
check('收到等待中的消息', w.ok === true && w.messages?.length === 1 && w.messages[0].text === '那你现在忙吗', w)
check('等待结束释放 hold', tools.isHolding('private:20002') === false)

// 8) 等待超时
const t0 = Date.now()
const w2 = await run('qq_wait_for_messages', { timeoutMs: 1000 })
check('超时返回空', w2.ok === true && w2.messages.length === 0, w2)
check('超时按 ms 走', Date.now() - t0 >= 900)

// 9) 收尾记录
const c1 = await run('qq_close_conversation', { note: '聊到他明天面试', next: '明天问一句' })
check('收尾 ok', c1.ok === true, c1)
check('收尾可读回', /聊到他明天面试/.test(tools.closingFor('private:20002')))
check('别的会话没有收尾', tools.closingFor('group:1') === '')

// 10) 一轮计数：reset 后能读到
settings.tools.minIntervalSec = 0
tools.resetTurn()
await run('qq_send_message', { text: '再发一条' })
check('turnSends 记账', tools.turnSends() === 1, tools.turnSends())

// 11) 回看消息
const g = await run('qq_get_recent_messages', { limit: 3 })
check('回看有内容', g.ok === true && /在吗/.test(g.text || ''), g)

// 12) 摘掉 agent 后工具消失
tools.detach(fakeAgent)
check('detach 清空', registry.size === 0)

// 13) 第二 agent 换 peer，重新注册
const registry2 = new Map()
const agent2 = { id: 'session-2', ctx: { get: (k) => (k === 'tools' ? { register: (def) => { registry2.set(def.name, def); return () => {} } } : null) } }
check('第二个会话也能挂', tools.attach(agent2, { peer: 'group:1132390404', kind: 'group', target: '1132390404' }) === true)
check('第二次注册 5 个', registry2.size === 5, [...registry2.keys()])

// 14) 没有 tools 服务的 agent 要诚实返回 false（调用方据此退回自动转发）
const bare = { id: 'session-3', ctx: { get: () => null } }
check('没工具服务时返回 false', tools.attach(bare, { peer: 'private:1', kind: 'private', target: '1' }) === false)

let bad = 0
for (const c of cases) {
  if (c.ok) console.log(`ok   ${c.name}`)
  else { bad += 1; console.log(`FAIL ${c.name}\n  detail ${JSON.stringify(c.detail)}`) }
}
console.log(bad ? `${bad} failed` : `${cases.length} passed`)
process.exit(bad ? 1 : 0)
