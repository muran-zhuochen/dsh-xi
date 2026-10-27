import { extractText, toPlain, splitText, isAtSelf } from '../lib/text.js'

const cases = []
const eq = (name, got, want) => cases.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), got, want })

eq('array', extractText([{ type: 'text', data: { text: '你好 ' } }, { type: 'at', data: { qq: '10001' } }, { type: 'image', data: {} }]), '你好 @10001[图片]')
eq('cq', extractText('[CQ:at,qq=10001] 在吗 [CQ:image,file=x]'), '@10001 在吗 [图片]')
eq('at', isAtSelf([{ type: 'at', data: { qq: '10001' } }], '10001'), true)
eq('at-not', isAtSelf([{ type: 'text', data: { text: 'hi' } }], '10001'), false)
eq('plain-md', toPlain('## 标题\n**粗** 和 `code`\n- 一\n[链接](https://a.b)\n\n\n\n尾'), '标题\n粗 和 code\n· 一\n链接（https://a.b）\n\n尾')
eq('split-len', splitText('a'.repeat(500), 200).map((s) => s.length), [200, 200, 100])
eq('split-short', splitText('hello', 50), ['hello'])
eq('split-nl', splitText('x'.repeat(20) + '\n' + 'y'.repeat(400), 200)[0].length, 200)
eq('split-keep', splitText('x'.repeat(20) + '\n' + 'y'.repeat(400), 200).join('').replace(/\n/g, '') === 'x'.repeat(20) + 'y'.repeat(400), true)

let bad = 0
for (const c of cases) {
  if (c.ok) console.log(`ok   ${c.name}`)
  else { bad += 1; console.log(`FAIL ${c.name}\n  got  ${JSON.stringify(c.got)}\n  want ${JSON.stringify(c.want)}`) }
}
console.log(bad ? `${bad} failed` : `${cases.length} passed`)
process.exit(bad ? 1 : 0)
