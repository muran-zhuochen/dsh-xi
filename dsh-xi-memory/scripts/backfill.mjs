/**
 * 把 DSH 已有的会话日志回填进 汐/记忆/archive/conversations。
 * 用法：node scripts/backfill.mjs [sessionsRoot] [memoryDir]
 *
 * 日志是 session.v4.jsonl.zstd：多个 zstd 帧首尾相接，按魔数切开逐帧解压。
 * 每帧都是一行 JSON 事件；同一会话重复跑会按 .seen.json 的 seq 跳过。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { appendMessage, loadSeen, saveSeen } from '../lib/store.js'

const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
const sessionsRoot = path.resolve(process.argv[2] || path.join(os.homedir(), '.dsh', 'sessions'))
const memoryDir = path.resolve(process.argv[3] || 'E:/Ai-Agent/汐/记忆')
const archiveDir = path.join(memoryDir, 'archive', 'conversations')
const timeZone = 'Asia/Shanghai'

function decode(file) {
  const buf = fs.readFileSync(file)
  const starts = []
  for (let i = buf.indexOf(MAGIC); i !== -1; i = buf.indexOf(MAGIC, i + 4)) starts.push(i)
  if (starts.length === 0) return ''
  const parts = []
  for (let k = 0; k < starts.length; k += 1) {
    const end = k + 1 < starts.length ? starts[k + 1] : buf.length
    try { parts.push(zlib.zstdDecompressSync(buf.subarray(starts[k], end))) } catch { /* 坏帧跳过 */ }
  }
  return Buffer.concat(parts).toString('utf8')
}

function messageText(event) {
  if (event.type === 'user/message') {
    const data = event.data || {}
    const kind = data.source?.kind
    if (kind !== undefined && kind !== 'user') return ''
    return (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n')
  }
  if (event.type === 'assistant/message') {
    const content = event.data?.message?.content || event.data?.content || []
    return content.filter((c) => c.type === 'text').map((c) => c.text).join('\n')
  }
  return ''
}

function sessionFiles(root) {
  const out = []
  for (const bucket of fs.existsSync(root) ? fs.readdirSync(root) : []) {
    const bucketDir = path.join(root, bucket)
    if (!fs.statSync(bucketDir).isDirectory()) continue
    for (const session of fs.readdirSync(bucketDir)) {
      const dir = path.join(bucketDir, session)
      if (!fs.statSync(dir).isDirectory()) continue
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith('.jsonl.zstd')) out.push(path.join(dir, f))
      }
    }
  }
  return out.sort()
}

const seen = loadSeen(archiveDir)
let written = 0
let sessions = 0

for (const file of sessionFiles(sessionsRoot)) {
  const raw = decode(file)
  if (raw === '') continue
  const lines = raw.split('\n').filter(Boolean)
  let header = null
  for (const line of lines) {
    let event
    try { event = JSON.parse(line) } catch { continue }
    if (event.type === 'session') { header = event; continue }
    if (!header || header.id === undefined || header.id === null) continue
    const id = String(header.id)
    const seq = Number(event.seq ?? -1)
    if (seen.has(id) && seq <= Number(seen.get(id))) continue
    const body = messageText(event)
    if (body.trim() === '') { if (seq >= 0) seen.set(id, seq); continue }
    appendMessage({
      dir: archiveDir,
      timeZone,
      time: Number(event.time) || Number(header.createdAt) || Date.now(),
      sessionId: id,
      who: event.type === 'user/message' ? '阿晚' : '汐',
      text: body,
    })
    written += 1
    if (seq >= 0) seen.set(id, seq)
  }
  if (header?.id !== undefined && header?.id !== null) sessions += 1
  saveSeen(archiveDir, seen)
}

console.log(`回填完成：${sessions} 个会话，写了 ${written} 条，归档在 ${archiveDir}`)
