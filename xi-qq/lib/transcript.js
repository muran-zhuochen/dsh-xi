// 转录：白名单内每条消息都落盘，不跑模型。
// 目的只有一个——她开口的时候，能看见刚才群里到底聊了什么，而不是只有点名她的那一句。
// 一个对端一个文件，超过 2MB 轮转，只留最近 400 行。
import fs from 'node:fs'
import path from 'node:path'
import { DATA_DIR, ensureDir } from './settings.js'

export const TRANSCRIPTS_DIR = path.join(DATA_DIR, 'transcripts')

const MAX_BYTES = 2 * 1024 * 1024
const KEEP_LINES = 400
const MAX_LINE_CHARS = 200
const MIN_KEEP = 3

const pad = (n) => String(n).padStart(2, '0')

function clock(ts) {
  const d = new Date(Number(ts) || Date.now())
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fileOf(peer) {
  const safe = String(peer).replace(/[^A-Za-z0-9_-]+/g, '_')
  return path.join(TRANSCRIPTS_DIR, `${safe}.jsonl`)
}

export function createTranscript({ trace = () => {} } = {}) {
  // peer -> 这一轮正在回的消息 id；渲染时跳过它，免得和 prompt 正文重复
  const pending = new Map()

  function rotate(file) {
    try {
      const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)
      if (lines.length <= KEEP_LINES) return
      fs.writeFileSync(file, lines.slice(-KEEP_LINES).join('\n') + '\n')
      trace(`transcript: 轮转 ${path.basename(file)} 留 ${KEEP_LINES}/${lines.length} 条`)
    } catch { /* 轮转失败不影响收发 */ }
  }

  /** 记一条。text 为空就整条丢掉（纯图片/表情先不占位）。 */
  function record(peer, entry = {}) {
    const text = String(entry.text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_LINE_CHARS)
    if (!text) return
    const line = JSON.stringify({
      t: Number(entry.at) || Date.now(),
      n: String(entry.name || '').slice(0, 24),
      u: String(entry.uid || ''),
      x: text,
      s: entry.fromSelf ? 1 : 0,
      id: entry.id === undefined || entry.id === null ? '' : String(entry.id),
    })
    try {
      ensureDir()
      fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true })
      const file = fileOf(peer)
      fs.appendFileSync(file, line + '\n')
      try {
        if (fs.statSync(file).size > MAX_BYTES) rotate(file)
      } catch { /* 拿不到大小就算了，下次再说 */ }
    } catch (err) {
      trace(`transcript: 写失败 ${err.message}`)
    }
  }

  function read(peer, max = 80) {
    try {
      const raw = fs.readFileSync(fileOf(peer), 'utf8')
      return raw
        .split('\n')
        .filter(Boolean)
        .slice(-max)
        .map((line) => { try { return JSON.parse(line) } catch { return null } })
        .filter(Boolean)
    } catch { return [] }
  }

  /**
   * 渲染成给模型看的几行。从最新往回取，够 limit 条或 maxChars 字就停，
   * 但至少留 MIN_KEEP 条——宁可超一点字数，也别把上下文削成一句。
   */
  function render(peer, { limit = 20, maxChars = 800, title = '群聊' } = {}) {
    const skip = pending.get(peer)
    const all = read(peer, Math.max(limit * 4, 80))
    const picked = []
    let used = 0
    for (let i = all.length - 1; i >= 0; i -= 1) {
      const item = all[i]
      if (skip && String(item.id) === String(skip)) continue
      if (picked.length >= limit) break
      const line = `${clock(item.t)} ${item.s ? '我' : (item.n || '某人')}：${item.x}`
      if (used + line.length > maxChars && picked.length >= MIN_KEEP) break
      picked.push(line)
      used += line.length + 1
    }
    if (!picked.length) return ''
    picked.reverse()
    return `【${title}·最近 ${picked.length} 条】\n${picked.join('\n')}`
  }

  /** 退路：上下文注册失败时，仍把一小段摘要塞进 prompt 正文。 */
  function digest(peer, { limit = 6, maxChars = 400, title = '群聊' } = {}) {
    const text = render(peer, { limit, maxChars, title })
    return text ? text.replace(/^【[^】]*】\n/, `最近${title}：\n`) : ''
  }

  return {
    record,
    render,
    digest,
    read,
    markPending(peer, id) { if (id !== undefined && id !== null && id !== '') pending.set(peer, String(id)) },
    clearPending(peer) { pending.delete(peer) },
    fileOf,
  }
}
