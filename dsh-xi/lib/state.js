import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { hasPersona } from './persona.js'
import { PLUGIN_VERSION } from './upgrade.js'

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
    const m = line.match(/^-\s+(\d{4}-\d{2}-\d{2})\s+\[(\d)(?:·[^\]]*)?\]\s+(.*?)(?:\s*·\s*用\s*(\d{4}-\d{2}-\d{2}))?\s*$/)
    if (m) facts.push({ section, date: m[1], weight: Number(m[2]), text: m[3], used: m[4] || m[1] })
  }
  return facts
}

function latestDiary(dir) {
  const d = path.join(dir, '短期记忆', '日记')
  if (!stat(d)) return { date: '', content: '' }
  const files = fs.readdirSync(d).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort()
  if (!files.length) return { date: '', content: '' }
  const f = files[files.length - 1]
  return { date: f.replace('.md', ''), content: read(path.join(d, f)) || '' }
}

function parseArchive(dir) {
  const factsDir = path.join(dir, '遗忘的记忆', '事实')
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
  const inf = read(path.join(dir, '遗忘的记忆', '影响.md')) || ''
  const permanentDir = path.join(dir, '永久记忆')
  let permanent = 0
  if (stat(permanentDir)) {
    for (const f of fs.readdirSync(permanentDir).filter((x) => x.endsWith('.md') && x !== 'README.md')) {
      const txt = read(path.join(permanentDir, f)) || ''
      permanent += txt.split(/\r?\n/).filter((l) => /^-\s+\d{4}-\d{2}-\d{2}/.test(l)).length
    }
  }
  const preciousDir = path.join(dir, '珍贵的记忆')
  const precious = stat(preciousDir)
    ? fs.readdirSync(preciousDir).filter((x) => x.endsWith('.md') && x !== 'README.md' && x !== '索引.md').length
    : 0
  return {
    facts,
    total,
    permanent,
    precious,
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
    budget: { line: 1, tightLine: 0.3, tightBalance: 2 },
  }
}
