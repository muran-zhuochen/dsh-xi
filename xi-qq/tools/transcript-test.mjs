// 转录的离线自检：不连 QQ、不跑模型。
// 用法：node tools/transcript-test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const tmp = path.join(here, '..', '.tmp-test', `run-${process.pid}`)
fs.rmSync(tmp, { recursive: true, force: true })
fs.mkdirSync(tmp, { recursive: true })
process.env.DSH_HOME = tmp

const { createTranscript } = await import('../lib/transcript.js')

let failed = 0
const ok = (cond, label, extra = '') => {
  if (cond) { console.log(`  ok   ${label}`) } else { failed += 1; console.log(`  FAIL ${label} ${extra}`) }
}

const tr = createTranscript({ trace: () => {} })
const peer = 'group:1132390404'

// 30 条，模拟群里连着说话
for (let i = 0; i < 30; i += 1) {
  tr.record(peer, { id: 1000 + i, name: i % 3 ? '群友甲' : '阿晚', uid: '2000' + i, text: `第 ${i} 句，随便说点什么凑长度` })
}
const text = tr.render(peer, { limit: 20, maxChars: 800 })
const lines = text.split('\n')
console.log('--- 渲染结果 ---')
console.log(text)
console.log('----------------')

ok(lines.length === 21, '20 条正文 + 1 行标题', `实际 ${lines.length - 1} 条`)
ok(text.length <= 800 + 40, '总字数不超预算', `实际 ${text.length}`)
ok(/^【群聊·最近 \d+ 条】/.test(lines[0]), '标题格式', lines[0])
ok(/\d\d:\d\d 群友甲：第 29 句/.test(text), '最后一条是最新的')
ok(!/第 0 句/.test(text), '最老的被截掉')

// 正在回的那条要跳过，免得和正文重复
tr.markPending(peer, 1029)
const noPending = tr.render(peer, { limit: 20, maxChars: 800 })
ok(!/第 29 句/.test(noPending), 'pending 那条被跳过')
ok(/第 28 句/.test(noPending), '前一条还在')
tr.clearPending(peer)

// 退路摘要
const digest = tr.digest(peer, { limit: 6, maxChars: 400 })
ok(digest.startsWith('最近群聊：'), '摘要开头', digest.slice(0, 20))
ok(digest.split('\n').length === 7, '摘要 6 条', `${digest.split('\n').length - 1}`)

// 超长单条被压到 200 字以内
tr.record(peer, { id: 2000, name: '刷屏侠', text: '啊'.repeat(500) })
const long = tr.render(peer, { limit: 1, maxChars: 9999 })
ok(long.length < 260, '单条压到 200 字以内', `实际 ${long.length}`)

// 私聊走另一个文件，互不串
tr.record('private:1878017644', { id: 3000, name: '阿晚', text: '私聊一句' })
ok(tr.render('private:1878017644').includes('私聊一句'), '私聊单独一份')
ok(!tr.render(peer).includes('私聊一句'), '群聊没被私聊污染')

// 空内容不落盘
const before = tr.read(peer, 500).length
tr.record(peer, { id: 3001, name: '空', text: '   ' })
ok(tr.read(peer, 500).length === before, '空白消息不记录')

console.log(failed ? `\n${failed} 项失败` : '\n全部通过')
fs.rmSync(tmp, { recursive: true, force: true })
process.exit(failed ? 1 : 0)
