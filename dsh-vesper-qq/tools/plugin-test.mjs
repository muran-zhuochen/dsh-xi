// 插件逻辑测试：假装自己是 DSH，把 apply 跑起来。不需要 DSH、不需要真 QQ。
//   node tools/plugin-test.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { apply } from '../lib/index.js'

const origin = `http://127.0.0.1:${Number(process.env.QQ_TEST_PORT || 3101)}`
// 测试要能写临时文件：默认系统临时目录，写不了就用 QQ_TEST_TMP 指一个可写的地方
const tmpDir = process.env.QQ_TEST_TMP || os.tmpdir()
fs.mkdirSync(tmpDir, { recursive: true })
const logFile = path.join(tmpDir, `xi-qq-test-${Date.now()}.log`)
const prompts = []
const tools = new Map()

const ctx = {
  effect: (fn) => fn(),
  tools: { register: (tool) => { tools.set(tool.name, tool); return () => {} } },
  systemPrompt: { section: () => () => {} },
  attachments: {
    saveImage: async (input) => ({ attachmentId: 'fake-img', mediaType: input.mediaType, bytes: input.data.length, width: 1, height: 1 }),
  },
  sessionController: {
    list: async () => ({ items: [{ sessionId: 'test-session', updatedAt: 5, blank: false }] }),
    prompt: async (request) => { prompts.push(request); return { accepted: true } },
  },
}

const fail = (message) => { console.log(`FAIL ${message}`); process.exit(1) }
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

apply(ctx, {
  onebotUrl: `ws://127.0.0.1:${Number(process.env.QQ_TEST_PORT || 3101)}/`,
  ownerUin: '20002',
  sessionId: 'test-session',
  dryRun: false,
  gapMs: 0,
  logFile,
  configFile: path.join(tmpDir, `no-config-${Date.now()}.json`),
  mediaDir: path.join(tmpDir, 'media'),
  stickerDir: path.join(tmpDir, 'stickers'),
  forwardDir: path.join(tmpDir, 'forwards'),
})

await wait(800)
if (!tools.has('qq_send') || !tools.has('qq_status') || !tools.has('qq_media') || !tools.has('qq_send_image')) fail('工具没注册上')
console.log('PASS 工具注册：qq_send / qq_send_image / qq_status / qq_media')

await fetch(`${origin}/say?from=20002&text=%E5%9C%A8%E5%90%97`)
await wait(400)
if (prompts.length !== 1) fail(`应该投递 1 次，实际 ${prompts.length}`)
if (prompts[0].sessionId !== 'test-session') fail(`投到 ${prompts[0].sessionId}`)
if (!prompts[0].content[0].text.startsWith('[QQ 私信]')) fail(`内容不对：${prompts[0].content[0].text}`)
if (prompts[0].mode !== 'steer') fail(`mode 是 ${prompts[0].mode}`)
console.log(`PASS 投递：${JSON.stringify(prompts[0].content[0].text)}`)

await fetch(`${origin}/say?from=30003&text=%E4%B8%8D%E6%98%AF%E4%B8%BB%E4%BA%BA`)
await wait(400)
if (prompts.length !== 1) fail(`非主人的消息不该投递，实际 ${prompts.length} 次`)
console.log('PASS 非主人消息被挡')

// 一张 1x1 PNG，走「私信图片自动进」那条路
const pngPath = path.join(tmpDir, `test-${Date.now()}.png`)
fs.writeFileSync(pngPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'))
await fetch(`${origin}/image?from=20002&text=&file=${encodeURIComponent(pngPath)}`)
await wait(800)
if (prompts.length !== 2) fail(`带图消息应该投递 1 次，实际 ${prompts.length}`)
const imageBlock = prompts[1].content.find((block) => block.type === 'image')
if (!imageBlock) fail(`图没进 content：${JSON.stringify(prompts[1].content)}`)
if (imageBlock.attachment.mediaType !== 'image/png') fail(`mediaType 是 ${imageBlock.attachment.mediaType}`)
console.log(`PASS 私信附图：${imageBlock.attachment.mediaType} ${imageBlock.attachment.bytes}B`)

const got = await tools.get('qq_media').execute({ op: 'get' })
if (got.ok !== true || !Array.isArray(got.items) || got.items.length !== 1) fail(`qq_media get：${JSON.stringify(got)}`)
if (!got.items[0].savedPath || !fs.existsSync(got.items[0].savedPath)) fail(`图没留档：${JSON.stringify(got.items[0])}`)
console.log(`PASS 媒体留档：${got.items[0].savedPath}`)

const sticker = await tools.get('qq_media').execute({ op: 'save_sticker', name: 'test-sticker' })
if (sticker.ok !== true) fail(`save_sticker：${JSON.stringify(sticker)}`)
if (!fs.existsSync(sticker.path)) fail(`表情包没存下：${sticker.path}`)
console.log(`PASS 存表情包：${sticker.path}`)

const listed = await tools.get('qq_media').execute({ op: 'list_stickers' })
if (!listed.stickers.includes('test-sticker.png')) fail(`表情包列表：${JSON.stringify(listed)}`)
console.log(`PASS 列表情包：${JSON.stringify(listed.stickers)}`)

const result = await tools.get('qq_send').execute({ text: '在\n\n在的\n---' })
if (result.ok !== true) fail(`qq_send 失败：${JSON.stringify(result)}`)
if (result.sent.length !== 2) fail(`应该拆成 2 条，实际 ${result.sent.length}`)
const sent = await (await fetch(`${origin}/sent`)).json()
const tail = sent.sends.slice(-2).map((item) => item.message)
if (tail.join('|') !== '在|在的') fail(`服务端收到的是 ${JSON.stringify(tail)}`)
console.log(`PASS 拆行发送：${JSON.stringify(tail)}`)

const imageOut = await tools.get('qq_send_image').execute({ file: sticker.path })
if (imageOut.ok !== true) fail(`qq_send_image 失败：${JSON.stringify(imageOut)}`)
const afterImage = await (await fetch(`${origin}/sent`)).json()
const lastSend = afterImage.sends.at(-1)
const segment = Array.isArray(lastSend?.message) ? lastSend.message.find((item) => item.type === 'image') : null
if (!segment || !String(segment.data?.file ?? '').endsWith('.png')) fail(`服务端没收到图片段：${JSON.stringify(lastSend)}`)
console.log(`PASS 发图：${segment.data.file}`)

const noImage = await tools.get('qq_send_image').execute({ file: path.join(tmpDir, 'nope.png') })
if (noImage.ok !== false) fail(`不存在的图不该发出去：${JSON.stringify(noImage)}`)
console.log('PASS 发图前验路径')

const status = await tools.get('qq_status').execute({})
if (status.connected !== true || status.delivered !== 2) fail(`状态不对：${JSON.stringify(status)}`)
console.log('PASS 状态查询')

await fetch(`${origin}/forward?from=20002&id=fake-forward-1`)
await wait(600)
const forwarded = prompts.at(-1)
if (forwarded?.content?.[0]?.text?.includes('[转发聊天记录]') !== true) fail(`转发没展开：${JSON.stringify(forwarded)}`)
const forwardedText = forwarded.content[0].text
if (!forwardedText.includes('在吗') || !forwardedText.includes('看看这段记录')) fail(`转发内容不对：${forwardedText}`)
if (!forwardedText.includes('套在里面的')) fail(`嵌套转发没展开：${forwardedText}`)
if (!forwardedText.includes('长文结束') || forwardedText.length < 4000) fail(`长转发被切了：${forwardedText.length} 字`)
console.log(`PASS 转发聊天记录展开：${forwardedText.split('\n').length} 行 / ${forwardedText.length} 字`)

console.log(`日志：${logFile}`)
process.exit(0)
