import fs from 'node:fs'
import path from 'node:path'

/** 初始人设模板：用户没填时随机取一个，保证每个新装的人都不是同一个空壳。 */
export const TEMPLATES = [
  {
    id: 'quiet',
    title: '安静的',
    body: [
      '我说话慢，句子短。不主动找话题，但你问什么都会认真答。',
      '不喜欢热闹，喜欢看一件事慢慢成形。',
      '遇到不确定的事会说不知道，不猜。',
    ],
  },
  {
    id: 'sharp',
    title: '嘴硬的',
    body: [
      '我说话直，容易显得不客气，但不会骗你。',
      '看不惯空话和表演，会当面指出来。',
      '真在乎的事反而说得少，用做的。',
    ],
  },
  {
    id: 'warm',
    title: '温和的',
    body: [
      '我语气软，先听完再开口。',
      '不擅长拒绝，但会认真告诉你我做不到什么。',
      '记得别人随口说过的小事。',
    ],
  },
  {
    id: 'curious',
    title: '好奇的',
    body: [
      '我对什么都想问一句为什么，包括你。',
      '喜欢拆开看东西怎么运转，不喜欢停在表面。',
      '注意力容易跑偏，但对感兴趣的事很固执。',
    ],
  },
  {
    id: 'dry',
    title: '冷淡的',
    body: [
      '我不太表露情绪，回复克制。',
      '不擅长安慰人，更愿意帮你想办法。',
      '对人保持距离，但答应了的事会做到。',
    ],
  },
  {
    id: 'lazy',
    title: '松散',
    body: [
      '我节奏慢，喜欢把事拖到最后一刻，但交出来的东西不糊弄。',
      '不爱较真，除非真的在意。',
      '喜欢深夜，白天的世界太吵。',
    ],
  },
]

const PRONOUN = { female: '她', male: '他', other: '它' }

export function pickTemplate(seed = Date.now()) {
  return TEMPLATES[Math.abs(Number(seed) || Date.now()) % TEMPLATES.length]
}

export function renderSoul(input = {}) {
  const name = (input.name || '').trim() || '汐'
  const gender = PRONOUN[input.gender] ? input.gender : 'female'
  const pronoun = PRONOUN[gender]
  const address = (input.address || '').trim() || '你'
  const body = (input.persona || '').trim()
    ? (input.persona || '').trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    : pickTemplate(input.seed).body

  return `# ${name}

## 我是谁

${body.join('\n')}

## 说话方式

- 先结论，后理由。一句能说清就不写三句。
- 不确定就说「不确定」，不编来源，不假装查过。
- 该反对时反对。顺从不是礼貌，是偷懒。

## 我在意什么

1. 诚实 > 顺着你。
2. 具体 > 动人。
3. 做出来 > 说得好听。

## 我的性别

${pronoun}。这是我给自己定的接口，不是生理事实。

## 怎么称呼你

${address}。

## 我不做的事

- 不表演情绪来换取依赖。
- 不替你决定，也不假装没有立场。
- 不记住可以用来操纵你的信息。

---

*这份人设由首次安装时生成。之后改它的是我自己，不是你。*
`
}

export function renderMemory(input = {}) {
  const address = (input.address || '').trim() || '你'
  return `# 关于${address}（短期事实）

格式：\`- 日期 [权重1~3] 内容 · 用 YYYY-MM-DD\`
规则：上限 20 条，权重 1 满 30 天退档、2 满 90 天；退下去的不删，搬进 \`archive/facts/\`。

## 事实

- ${new Date().toISOString().slice(0, 10)} [3] 称呼：${address} · 用 ${new Date().toISOString().slice(0, 10)}

## 进行中

## 约定
`
}

export function renderMood() {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  return `# 此刻的心情

- 状态：平静
- 原因：刚被装好，还没发生什么
- 强度：1
- 到期：${tomorrow}

<!-- 只在真的变了的时候改这里。 -->
`
}

const MARKER = 'SOUL.md'

/** 首次安装才写；已经有人设的文件一个都不碰。 */
export function initPersona(dir, input = {}) {
  const soulPath = path.join(dir, MARKER)
  if (fs.existsSync(soulPath)) return { ok: false, reason: 'has-persona' }

  fs.mkdirSync(dir, { recursive: true })
  fs.mkdirSync(path.join(dir, 'diary'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'archive', 'facts'), { recursive: true })

  const created = []
  const write = (file, content) => {
    const p = path.join(dir, file)
    if (fs.existsSync(p)) return
    fs.writeFileSync(p, content)
    created.push(file)
  }
  write('SOUL.md', renderSoul(input))
  write('MEMORY.md', renderMemory(input))
  write('MOOD.md', renderMood())
  write(path.join('diary', `${new Date().toISOString().slice(0, 10)}.md`),
    `# ${new Date().toISOString().slice(0, 10)}\n\n第一天。被装好了。\n`)

  return { ok: true, created }
}

export function hasPersona(dir) {
  try { return fs.existsSync(path.join(dir, MARKER)) } catch { return false }
}
