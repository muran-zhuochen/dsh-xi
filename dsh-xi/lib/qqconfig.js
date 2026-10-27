import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

/** 只放配置读写，不碰网络和进程：state.js 也要用，避免循环依赖。 */
const HOME = process.env.USERPROFILE || os.homedir()
export const DSH_HOME = process.env.DSH_HOME || path.join(HOME, '.dsh')
export const QQ_DIR = path.join(DSH_HOME, 'xi-qq')
export const QQ_SETTINGS = path.join(QQ_DIR, 'settings.json')
export const QQ_STATUS = path.join(QQ_DIR, 'status.json')

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/** 深合并：对象递归，数组和标量覆盖。界面只改一个字段时不用回传整块。 */
export function mergeDeep(base, layer) {
  if (!isPlain(layer)) return layer === undefined ? base : layer
  const out = isPlain(base) ? { ...base } : {}
  for (const [k, v] of Object.entries(layer)) {
    out[k] = isPlain(v) && isPlain(out[k]) ? mergeDeep(out[k], v) : v
  }
  return out
}

export const QQ_DEFAULTS = {
  enabled: true,
  wsUrl: 'ws://127.0.0.1:3001',
  accessToken: '',
  selfId: '',
  allowUsers: [],
  groups: [],
  groupRequireAt: true,
  cwd: '',
  agentPreset: '',
  timeoutMs: 180000,
  maxReplyChars: 1500,
  selftest: false,
  autostartNapCat: false,
  privateChat: { enabled: true, minIntervalSec: 0, maxPerHour: 0 },
  groupPolicy: {
    enabled: true,
    mention: { enabled: true, minIntervalSec: 15, maxPerHour: 30 },
    ambient: { enabled: false, minIntervalSec: 600, maxPerHour: 3, chance: 0.5, keywords: ['汐', '她', '阿晚'] },
  },
  limits: { dailyEnabled: true, dailyReplies: 200 },
  chat: { chunkReply: true, maxChunks: 3, typing: true, styleNote: true },
}

export function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) ?? fallback } catch { return fallback }
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
}

export function readQqSettings() {
  return mergeDeep(QQ_DEFAULTS, readJson(QQ_SETTINGS, {}))
}

/** 只改给出的字段，其余原样保留；dsh-xi-qq 会监听这个文件并即时生效。 */
export function patchQqSettings(patch = {}) {
  const next = mergeDeep(readJson(QQ_SETTINGS, {}), patch)
  writeJson(QQ_SETTINGS, next)
  return mergeDeep(QQ_DEFAULTS, next)
}
