import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const HOME = process.env.USERPROFILE || os.homedir()
export const DSH_HOME = process.env.DSH_HOME || path.join(HOME, '.dsh')
export const DATA_DIR = path.join(DSH_HOME, 'xi-qq')
export const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json')
export const LOG_PATH = path.join(DATA_DIR, 'qq.log')
export const SESSIONS_PATH = path.join(DATA_DIR, 'sessions.json')
export const STATUS_PATH = path.join(DATA_DIR, 'status.json')

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/** 深合并：对象递归，数组和标量直接覆盖。用来让界面只改某一层的一个字段。 */
export function mergeDeep(base, layer) {
  if (!isPlain(layer)) return layer === undefined ? base : layer
  const out = isPlain(base) ? { ...base } : {}
  for (const [k, v] of Object.entries(layer)) {
    out[k] = isPlain(v) && isPlain(out[k]) ? mergeDeep(out[k], v) : v
  }
  return out
}

export const DEFAULTS = {
  enabled: true,
  // OneBot 11 反向 WS 地址（NapCat 的 WebSocket 服务端）
  wsUrl: 'ws://127.0.0.1:3001',
  accessToken: '',
  // 机器人自己的 QQ 号；留空则用 OneBot 事件里的 self_id
  selfId: '',
  // 允许私聊的 QQ 号；空数组 = 所有私聊都回
  allowUsers: [],
  // 允许的群号；空数组 = 群里一律不回
  groups: [],
  // 群里是否必须 @ 才回（群策略总开关关闭时不看这个）
  groupRequireAt: true,
  // 会话工作目录；留空 = DSH 默认工作区
  cwd: '',
  // 指定 agent preset；留空 = 默认
  agentPreset: '',
  // 一轮最多等多久
  timeoutMs: 180000,
  // 单条 QQ 消息最大字数，超出自动分条
  maxReplyChars: 1500,
  // 启动时跑一次自检（不经过 QQ，直接问模型一句）
  selftest: false,
  // NapCat 自启动由 dsh-xi 控制台负责，这里只记着，方便状态展示
  autostartNapCat: false,

  // 私聊：开关 + 频率（0 = 不限）
  privateChat: { enabled: true, minIntervalSec: 0, maxPerHour: 0 },

  // 群聊：总开关 + @ 与不@ 两套频率
  groupPolicy: {
    enabled: true,
    mention: { enabled: true, minIntervalSec: 15, maxPerHour: 30 },
    ambient: {
      enabled: false,
      minIntervalSec: 600,
      maxPerHour: 3,
      chance: 0.5,
      keywords: ['汐', '她', '阿晚'],
    },
  },

  // 全通道硬上限：每天最多回多少条，过零点重置
  limits: { dailyEnabled: true, dailyReplies: 200 },

  // 说话方式：分条、正在输入、开头那句风格说明
  chat: { chunkReply: true, maxChunks: 3, typing: true, styleNote: true },

  // QQ 会话的审批策略：never = 不等人，工具直接拒（否则会卡死在审批上）
  approvalPolicy: 'never',
  // 插件启动时把已知会话里挂住的回合清掉
  unstickOnStart: true,
}

export function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

export function log(line) {
  try {
    ensureDir()
    const ts = new Date().toISOString()
    fs.appendFileSync(LOG_PATH, `${ts} ${line}\n`)
    const st = fs.statSync(LOG_PATH)
    if (st.size > 1_000_000) {
      fs.renameSync(LOG_PATH, LOG_PATH + '.1')
    }
  } catch { /* 诊断日志，失败不影响主流程 */ }
}

const arr = (v) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [])

function coerce(raw = {}) {
  const out = {}
  for (const [k, d] of Object.entries(DEFAULTS)) {
    if (!(k in raw) || raw[k] === undefined) continue
    const v = raw[k]
    if (isPlain(d)) out[k] = mergeDeep(d, isPlain(v) ? v : {})
    else if (Array.isArray(d)) out[k] = arr(v)
    else if (typeof d === 'boolean') out[k] = Boolean(v)
    else if (typeof d === 'number') out[k] = Number.isFinite(Number(v)) ? Number(v) : d
    else out[k] = String(v ?? '')
  }
  // 允许 settings.json 里出现 DEFAULTS 之外的新键（向前兼容）
  for (const [k, v] of Object.entries(raw)) if (!(k in out)) out[k] = v
  return out
}

export function loadSettings(config = {}) {
  let file = {}
  try { file = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')) || {} } catch { file = {} }
  return mergeDeep(DEFAULTS, mergeDeep(coerce(config), coerce(file)))
}

export function saveSettings(patch = {}) {
  let file = {}
  try { file = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')) || {} } catch { file = {} }
  const next = mergeDeep(file, patch)
  ensureDir()
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2) + '\n')
  return next
}

export function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) ?? fallback } catch { return fallback }
}

export function writeJson(p, value) {
  try {
    ensureDir()
    fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n')
  } catch { /* ignore */ }
}
