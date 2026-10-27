// 场景注册的离线自检：不启动 DSH，只验「挂上去的形状」和「渲染的内容」。
// 用法：node tools/scene-test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const tmp = path.join(here, '..', '.tmp-test', `scene-${process.pid}`)
fs.rmSync(tmp, { recursive: true, force: true })
fs.mkdirSync(tmp, { recursive: true })
process.env.DSH_HOME = tmp

const { createTranscript } = await import('../lib/transcript.js')
const { createScenes } = await import('../lib/scene.js')

let failed = 0
const ok = (cond, label, extra = '') => {
  if (cond) { console.log(`  ok   ${label}`) } else { failed += 1; console.log(`  FAIL ${label} ${extra}`) }
}

const transcript = createTranscript({ trace: () => {} })
const registered = []
let disposed = 0
const settings = { scene: { enabled: true, maxMessages: 20, maxChars: 800 } }
const scenes = createScenes({ trace: () => {}, getSettings: () => settings, transcript })

// 假 agent：只有 id 和带 systemPrompt 的 ctx，形状和 DSH 里一致
const makeAgent = (id) => ({
  id,
  ctx: {
    get: (key) => (key === 'systemPrompt'
      ? { context: (def) => { registered.push(def); return () => { disposed += 1 } } }
      : undefined),
  },
})

const agent = makeAgent('sess-1')
ok(scenes.attach(agent, 'group:1132390404') === true, '挂上了')
ok(registered.length === 1, '注册了一次')
ok(registered[0].name === 'qq-scene', '上下文名', registered[0].name)
ok(registered[0].order === 300, '排序值', String(registered[0].order))
ok(typeof registered[0].text === 'function', 'text 是函数（每步重算）')
ok(registered[0].text() === '', '没消息时不占位置')

transcript.record('group:1132390404', { id: 1, name: '阿晚', text: '在吗' })
transcript.record('group:1132390404', { id: 2, name: '群友', text: '他好像不在' })
const rendered = registered[0].text()
ok(rendered.includes('阿晚：在吗') && rendered.includes('群友：他好像不在'), '两条都在')

// 正在回的那条跳过
transcript.markPending('group:1132390404', 2)
ok(!registered[0].text().includes('他好像不在'), 'pending 被跳过')
transcript.clearPending('group:1132390404')

// 重复挂同一个 agent 不重复注册
ok(scenes.attach(agent, 'group:1132390404') === true, '重复挂返回 true')
ok(registered.length === 1, '没重复注册')
ok(scenes.isAttached('group:1132390404'), 'isAttached 认得')

// 关掉开关就不渲染
settings.scene.enabled = false
ok(registered[0].text() === '', '开关关掉后为空')
settings.scene.enabled = true

// 重启后同一个会话换了新 agent：旧的上下文要释放，新的重挂
const agentAgain = makeAgent('sess-1')
scenes.attach(agentAgain, 'group:1132390404')
ok(registered.length === 2, '同一个会话换了 agent 会重挂')
ok(disposed === 1, '旧 agent 的上下文被释放')

// 第二个会话独立一份
scenes.attach(makeAgent('sess-2'), 'group:999')
ok(registered.length === 3, '第二个会话单独注册')

// 拿不到 systemPrompt 时返回 false，调用方退回正文摘要
ok(scenes.attach({ id: 'sess-3', ctx: { get: () => undefined } }, 'group:1') === false, '拿不到就退回摘要')

scenes.disposeAll()
ok(disposed === 3, 'disposeAll 释放剩下三个', String(disposed))

console.log(failed ? `\n${failed} 项失败` : '\n全部通过')
fs.rmSync(tmp, { recursive: true, force: true })
process.exit(failed ? 1 : 0)
