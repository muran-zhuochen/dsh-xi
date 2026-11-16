import fs from 'node:fs'
import path from 'node:path'

const DAY_RE = /^\d{4}-\d{2}-\d{2}\.md$/

export function dayOf(ms, timeZone) {
  const d = new Date(ms)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d)
  const get = (t) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function stampOf(ms, timeZone) {
  const d = new Date(ms)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(d)
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('hour')}:${get('minute')}:${get('second')}`
}

/** 一条消息压成一行：换行变 ` / `，过长的截断。 */
export function flatten(text, max = 4000) {
  const one = String(text).replace(/\s*\r?\n\s*/g, ' / ').replace(/\s+/g, ' ').trim()
  if (one.length <= max) return one
  return `${one.slice(0, max)}…（截断 ${one.length - max} 字）`
}

export function readText(file) {
  try { return fs.readFileSync(file, 'utf8') } catch { return '' }
}

export function listDayFiles(dir) {
  try { return fs.readdirSync(dir).filter((f) => DAY_RE.test(f)).sort() } catch { return [] }
}

/** 追加一条对话；返回写入的文件。已有的日子不重写表头。 */
export function appendMessage({ dir, timeZone, time, sessionId, who, text }) {
  const day = dayOf(time, timeZone)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${day}.md`)
  const head = fs.existsSync(file) ? '' : `# ${day}\n\n`
  const tag = String(sessionId ?? '').replace(/^session-/, '').slice(0, 8) || '--------'
  const line = `- ${stampOf(time, timeZone)} [${tag}] ${who}：${flatten(text)}\n`
  fs.appendFileSync(file, head + line, 'utf8')
  return file
}

// ---- 已归档游标：每个会话记到最后一条 seq，重启后不重复写 ----

export function loadSeen(dir) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, '.seen.json'), 'utf8'))
    return new Map(Object.entries(raw))
  } catch { return new Map() }
}

export function saveSeen(dir, seen) {
  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, '.seen.json'), JSON.stringify(Object.fromEntries(seen)), 'utf8')
  } catch { /* 游标丢了最多重复一条，不挡归档 */ }
}

// ---- 检索 ----

const MAX_SCAN_MATCHES = 400

function splitLines(text) {
  return text.split(/\r?\n/)
}

function stripPrefix(line, isDiary) {
  if (isDiary) return line
  return line.replace(/^- \d{2}:\d{2}:\d{2} \[[^\]]*\] [^：]+：/, '')
}

function excerpt(line, needle, width = 110) {
  const at = needle === '' ? 0 : line.toLowerCase().indexOf(needle.toLowerCase())
  if (at < 0) return line.length > width * 2 ? `${line.slice(0, width * 2)}…` : line
  const start = Math.max(0, at - width)
  const end = Math.min(line.length, at + needle.length + width)
  return `${start > 0 ? '…' : ''}${line.slice(start, end)}${end < line.length ? '…' : ''}`
}

function whoOf(line, isDiary) {
  if (isDiary) return '日记'
  const m = /^- \d{2}:\d{2}:\d{2} \[[^\]]*\] ([^：]+)：/.exec(line)
  return m ? m[1] : '记录'
}

function timeOf(line, day, isDiary) {
  if (isDiary) return day
  const m = /^- (\d{2}:\d{2}:\d{2})/.exec(line)
  return m ? `${day} ${m[1]}` : day
}

/**
 * 按字面在聊天归档与日记里找，返回最新的在前。
 * @returns {{items: Array<{ref: string, time: string, who: string, text: string}>, nextCursor?: number, files: number}}
 */
export function searchArchive({ dirs, query, kind, from, to, order = 'newest', limit = 8, cursor = 0 }) {
  const needle = String(query ?? '').trim()
  if (needle === '') return { items: [], files: 0 }
  const sources = []
  if (kind !== 'diary' && dirs.conversations) sources.push({ dir: dirs.conversations, isDiary: false, base: 'archive/conversations' })
  if (kind !== 'conversation' && dirs.diary) sources.push({ dir: dirs.diary, isDiary: true, base: 'diary' })

  const matches = []
  let scanned = 0
  for (const source of sources) {
    const files = listDayFiles(source.dir).filter((f) => {
      const day = f.slice(0, 10)
      return (!from || day >= from) && (!to || day <= to)
    }).sort().reverse()
    for (const f of files) {
      scanned += 1
      const day = f.slice(0, 10)
      const lines = splitLines(readText(path.join(source.dir, f)))
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]
        if (line === '' || line.startsWith('#')) continue
        if (!line.toLowerCase().includes(needle.toLowerCase())) continue
        matches.push({
          ref: `${source.base}/${f}:${i + 1}`,
          time: timeOf(line, day, source.isDiary),
          who: whoOf(line, source.isDiary),
          text: excerpt(stripPrefix(line, source.isDiary), needle),
        })
        if (matches.length >= MAX_SCAN_MATCHES) break
      }
      if (matches.length >= MAX_SCAN_MATCHES) break
    }
  }
  if (order === 'oldest') matches.sort((a, b) => a.time.localeCompare(b.time))
  else matches.sort((a, b) => b.time.localeCompare(a.time))
  const start = Math.max(0, Number(cursor) || 0)
  const items = matches.slice(start, start + limit)
  const next = start + limit < matches.length ? start + limit : undefined
  return next === undefined ? { items, files: scanned, total: matches.length } : { items, files: scanned, total: matches.length, nextCursor: next }
}

/** 读某个 ref 指向的文件片段；offset/limit 以 Unicode 字符计。 */
export function readRefText({ memoryDir, ref, offset = 0, limit = 2000 }) {
  const m = /^(.+):(\d+)$/.exec(String(ref ?? '').trim())
  if (!m) throw new Error(`ref 格式不对：${ref}`)
  const rel = m[1].replace(/\\/g, '/')
  const lineNo = Number(m[2])
  const root = path.resolve(memoryDir)
  const abs = path.resolve(root, rel)
  if (!abs.startsWith(root + path.sep)) throw new Error(`ref 指向记忆目录外：${ref}`)
  const text = readText(abs)
  if (text === '') throw new Error(`读不到：${ref}`)
  const all = Array.from(text)
  const lines = text.split(/\r?\n/)
  let start = 0
  for (let i = 0; i < Math.min(lineNo - 1, lines.length); i += 1) start += Array.from(lines[i]).length + 1
  const off = Math.max(0, Number(offset) || 0)
  const len = Math.max(1, Math.min(16000, Number(limit) || 2000))
  const piece = all.slice(start + off, start + off + len).join('')
  const nextOffset = start + off + len < all.length ? off + len : undefined
  return nextOffset === undefined
    ? { ref, text: piece, end: true, total: all.length }
    : { ref, text: piece, nextOffset, end: false, total: all.length }
}

// ---- 开场注入 ----

let cache = { key: '', text: '' }

/** 常驻记忆块：事实 + 心情，附一句怎么翻旧话。内容没变就不重建。 */
export function renderMemoryBlock(memoryDir, maxChars = 4500) {
  const factsFile = path.join(memoryDir, 'MEMORY.md')
  const moodFile = path.join(memoryDir, 'MOOD.md')
  let stamp = ''
  try {
    stamp = `${fs.statSync(factsFile).mtimeMs}:${fs.statSync(moodFile).mtimeMs}:${maxChars}`
  } catch { return '' }
  if (cache.key === stamp) return cache.text

  const factsRaw = readText(factsFile)
  const facts = factsRaw
    .split(/\r?\n/)
    .filter((l) => l.startsWith('- ') || l.startsWith('## '))
    .join('\n')
  const mood = readText(moodFile)
    .split(/\r?\n/)
    .filter((l) => l.startsWith('- 状态') || l.startsWith('- 原因') || l.startsWith('- 到期'))
    .join('\n')

  const parts = ['## 记忆（常驻，由插件自动注入）', '下面是汐自己的记忆文件，已经在这里，不必再去读一遍。']
  if (facts) parts.push('<事实>\n' + facts.slice(0, maxChars) + (facts.length > maxChars ? '\n…（截断）' : ''))
  if (mood) parts.push('<此刻心情>\n' + mood)
  parts.push('要翻旧话：memory_find(query=原话里的一小段)，再 memory_read(ref)。不要把所有历史一次塞进上下文。')

  const text = parts.join('\n\n')
  cache = { key: stamp, text }
  return text
}
