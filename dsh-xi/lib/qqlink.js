import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { spawn } from 'node:child_process'
import {
  QQ_DIR, QQ_SETTINGS, QQ_STATUS, QQ_DEFAULTS, mergeDeep, readJson, writeJson,
  readQqSettings, patchQqSettings,
} from './qqconfig.js'

export { QQ_DIR, QQ_SETTINGS, QQ_STATUS, QQ_DEFAULTS, mergeDeep, readJson, writeJson, readQqSettings, patchQqSettings }

/** 汐的 QQ 通道：配置、状态、NapCat 进程，都在这一层处理。 */
export const NAPCAT_HOME = path.join(QQ_DIR, 'napcat', 'app', 'napcat')
const NAPCAT_LAUNCHER = path.join(NAPCAT_HOME, 'launcher.bat')

export function port() {
  const url = readQqSettings().wsUrl
  try { return Number(new URL(url).port) || 3001 } catch { return 3001 }
}

export function portOpen(target = port(), host = '127.0.0.1', timeoutMs = 700) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let settled = false
    const done = (value) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(value)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
    socket.connect(target, host)
  })
}

/**
 * 启动 NapCat。启动器内部会自我提权，所以这里只负责点火，不假设自己有管理员权限。
 */
export function startNapCat(trace = () => {}) {
  if (!fs.existsSync(NAPCAT_LAUNCHER)) {
    trace(`napcat: 找不到启动器 ${NAPCAT_LAUNCHER}`)
    return { ok: false, reason: 'missing-launcher' }
  }
  const args = ['/c', 'start', '', `"${NAPCAT_LAUNCHER}"`]
  try {
    const child = spawn('cmd.exe', args, { cwd: NAPCAT_HOME, detached: true, stdio: 'ignore', windowsHide: true })
    child.unref()
    trace('napcat: 已点火 launcher.bat')
    return { ok: true }
  } catch (err) {
    trace(`napcat: 启动失败 ${err.message}`)
    return { ok: false, reason: err.message }
  }
}

/** 给界面用的一份快照：通道配置 + 桥的运行状态 + 频率策略 + NapCat 是否在跑。 */
export async function qqSnapshot() {
  const settings = readQqSettings()
  const status = readJson(QQ_STATUS, {})
  const napcat = await portOpen()
  return {
    enabled: settings.enabled !== false,
    autostart: !!settings.autostartNapCat,
    wsUrl: settings.wsUrl,
    connected: !!status.connected && napcat,
    selfId: status.selfId || settings.selfId || '',
    peers: Number(status.peers) || 0,
    napcat,
    allowUsers: settings.allowUsers || [],
    groups: settings.groups || [],
    updatedAt: status.at || '',
    daily: status.daily || null,
    policy: {
      privateChat: settings.privateChat,
      groupPolicy: settings.groupPolicy,
      limits: settings.limits,
      chat: settings.chat,
    },
  }
}
