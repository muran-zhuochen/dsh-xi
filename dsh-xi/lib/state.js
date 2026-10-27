import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { hasPersona } from './persona.js'
import { PLUGIN_VERSION } from './upgrade.js'
import { readQqSettings, QQ_STATUS, QQ_REJECTED } from './qqconfig.js'

const HOME = process.env.USERPROFILE || os.homedir()
export const DSH_HOME = process.env.DSH_HOME || path.join(HOME, '.dsh')

/** 已存在的人设目录优先（本地老用户）；否则用 ~/.dsh/xi（新装用户）。 */
export function resolveDataDir(config = {}) {
  if (config && typeof config.dataDir === 'string' && config.dataDir.trim()) return config.dataDir.trim()
  const legacy = path.join(DSH_HOME, 'memory')
  if (hasPersona(legacy)) return legacy
  return path.join(DSH_HOME, 'xi')
}

/**
 * 人格目录：SOUL.md 放在这里。
 * 人格与记忆分家时由 profile 配置 personaDir；没配就跟记忆同目录，保持老行为。
 */
export function resolvePersonaDir(config = {}, dataDir = resolveDataDir(config)) {
  if (config && typeof config.personaDir === 'string' && config.personaDir.trim()) return config.personaDir.trim()
  return dataDir
}

const read = (p) => { try { return fs.readFileSync(p, 'utf8') } catch { return null } }
const stat = (p) => { try { return fs.statSync(p) } catch { return null } }

function parseSoul(dir) {
  const raw = read(path.join(dir, 'SOUL.md')) || ''
  return { title: (raw.match(/^#\s+(.+)$/m) || [])[1] || '', body: raw }
}

function parseMood(dir) {
  const raw = read(path.join(dir, 'MOOD.md')) || ''
  const out = { status: '未知', reason: '', intensity: '', expiry: '', raw }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^-\s*([^：:]+)[：:]\s*(.*)$/)
    if (!m) continue
    const k = m[1].trim(), v = m[2].trim()
    if (k === '状态') out.status = v
    else if (k === '原因') out.reason = v
    else if (k === '强度') out.intensity = v
    else if (k === '到期') out.expiry = v
  }
  return out
}

function parseMemory(dir) {
  const raw = read(path.join(dir, 'MEMORY.md')) || ''
  const facts = []
  let section = '其他'
  for (const line of raw.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+)$/)
    if (h) { section = h[1].trim(); continue }
    const m = line.match(/^-\s+(\d{4}-\d{2}-\d{2})\s+\[(\d)\]\s+(.*?)(?:\s*·\s*用\s*(\d{4}-\d{2}-\d{2}))?\s*$/)
    if (m) facts.push({ section, date: m[1], weight: Number(m[2]), text: m[3], used: m[4] || m[1] })
  }
  return facts
}

function latestDiary(dir) {
  const d = path.join(dir, 'diary')
  if (!stat(d)) return { date: '', content: '' }
  const files = fs.readdirSync(d).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort()
  if (!files.length) return { date: '', content: '' }
  const f = files[files.length - 1]
  return { date: f.replace('.md', ''), content: read(path.join(d, f)) || '' }
}

function parseArchive(dir) {
  const factsDir = path.join(dir, 'archive', 'facts')
  const facts = {}
  let total = 0
  if (stat(factsDir)) {
    for (const f of fs.readdirSync(factsDir).filter((x) => x.endsWith('.md'))) {
      const txt = read(path.join(factsDir, f)) || ''
      const n = txt.split(/\r?\n/).filter((l) => /^-\s+\d{4}-\d{2}-\d{2}/.test(l)).length
      facts[f.replace('.md', '')] = n
      total += n
    }
  }
  const inf = read(path.join(dir, 'archive', 'influence.md')) || ''
  return {
    facts,
    total,
    influence: inf.split(/\r?\n/).filter((l) => /^-\s+\d{4}-\d{2}-\d{2}/.test(l)),
  }
}

function parseCost() {
  const raw = read(path.join(DSH_HOME, '.dshw-usage.json'))
  if (!raw) return { today: 0, balance: 0, history: [] }
  try {
    const d = JSON.parse(raw)
    return {
      today: Number(d.todayUsage) || 0,
      balance: Number(d.lastBalance) || 0,
      history: Object.entries(d.history || {})
        .sort((a, b) => a[0].localeCompare(b[0])).slice(-7)
        .map(([date, amount]) => ({ date, amount: Number(amount) || 0 })),
    }
  } catch { return { today: 0, balance: 0, history: [] } }
}

function parseExtensions(root) {
  const out = []
  const d = path.join(root, 'extensions')
  if (!stat(d)) return out
  for (const name of fs.readdirSync(d)) {
    if (name.startsWith('_') || name.startsWith('.')) continue
    const raw = read(path.join(d, name, 'manifest.json'))
    if (!raw) continue
    try {
      const m = JSON.parse(raw)
      out.push({
        id: m.id || name, name: m.name || name, type: m.type || 'tool',
        status: m.status || 'planned', description: m.description || '',
        version: m.version || '0.0.0',
      })
    } catch { /* skip broken manifest */ }
  }
  return out
}

/** 白名单外来找过的人/群（dsh-xi-qq 写的 rejected.json），给界面做「一键加进来」。 */
function parseRejected() {
  const raw = read(QQ_REJECTED)
  if (!raw) return []
  try {
    const obj = JSON.parse(raw) || {}
    return Object.values(obj)
      .filter((x) => x && (x.kind === 'private' || x.kind === 'group') && x.id)
      .sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0))
      .slice(0, 12)
      .map((x) => ({
        kind: x.kind,
        id: String(x.id),
        name: String(x.name || ''),
        at: Number(x.at) || 0,
        count: Number(x.count) || 1,
      }))
  } catch { return [] }
}

/** 通道运行态：来自 dsh-xi-qq 写的 status.json 与共享的 settings.json。 */
function parseChannels() {
  const settings = readQqSettings()
  const status = (() => {
    try { return JSON.parse(read(QQ_STATUS) || '{}') || {} } catch { return {} }
  })()
  return {
    qq: {
      enabled: settings.enabled !== false,
      autostart: !!settings.autostartNapCat,
      connected: !!status.connected,
      napcat: !!status.napcatUp,
      selfId: status.selfId || settings.selfId || '',
      version: status.version || '',
      peers: Number(status.peers) || 0,
      at: status.at || '',
      daily: status.daily || null,
      // 白名单：只有名单里的群 / 私聊会回话
      groups: settings.groups || [],
      allowUsers: settings.allowUsers || [],
      rejected: parseRejected(),
      policy: {
        privateChat: settings.privateChat,
        groupPolicy: settings.groupPolicy,
        limits: settings.limits,
        chat: settings.chat,
      },
    },
  }
}

export function buildState(root = process.cwd(), dir = resolveDataDir(), personaDir = dir) {
  return {
    updatedAt: new Date().toISOString(),
    plugin: { version: PLUGIN_VERSION },
    onboarding: !hasPersona(personaDir),
    dataDir: dir,
    personaDir,
    soul: parseSoul(personaDir),
    mood: parseMood(dir),
    memory: parseMemory(dir),
    diary: latestDiary(dir),
    archive: parseArchive(dir),
    cost: parseCost(),
    extensions: parseExtensions(root),
    channels: parseChannels(),
    budget: { line: 1, tightLine: 0.3, tightBalance: 2 },
  }
}
