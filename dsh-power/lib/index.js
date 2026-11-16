import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-power'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = path.join(ROOT, 'scripts', 'power.ps1')
const DSH_HOME = process.env.DSH_HOME || path.join(process.env.USERPROFILE || os.homedir(), '.dsh')
const LOG = path.join(DSH_HOME, 'dsh-power.log')
const POWERSHELL = path.join(
  process.env.SystemRoot || 'C:\\Windows',
  'System32',
  'WindowsPowerShell',
  'v1.0',
  'powershell.exe',
)

/** Per-action deadline; quit and restart wait for the app to exit (12s) before force-killing. */
const DEADLINES = { minimize: 15000, quit: 40000, restart: 40000 }

const EXIT_CODES = {
  3: 'no-process',
  4: 'no-window',
  5: 'exe-missing',
  6: 'exe-missing',
}

function runAction(action) {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    let child
    try {
      child = spawn(
        POWERSHELL,
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT, '-Action', action, '-LogPath', LOG],
        { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
      )
    } catch (error) {
      finish({ ok: false, code: 'spawn-failed', message: error?.message ?? String(error) })
      return
    }
    let stderr = ''
    child.stdout.on('data', () => {})
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
      if (stderr.length > 4000) stderr = stderr.slice(-4000)
    })
    const timer = setTimeout(() => {
      try { child.kill() } catch { /* already gone */ }
      finish({ ok: false, code: 'timeout', message: `no result within ${DEADLINES[action]}ms` })
    }, DEADLINES[action] ?? 15000)
    child.on('error', (error) => {
      clearTimeout(timer)
      finish({ ok: false, code: 'spawn-failed', message: error?.message ?? String(error) })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) finish({ ok: true })
      else finish({ ok: false, code: EXIT_CODES[code] ?? 'powershell-failed', message: stderr.trim() || `powershell exit ${code}` })
    })
  })
}

export function apply(ctx) {
  const json = (body, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

  const handlerFor = (action) => async () => {
    if (process.platform !== 'win32') {
      return json({ ok: false, code: 'unsupported', message: 'window actions need Windows' })
    }
    const result = await runAction(action)
    if (result.ok) return json({ ok: true, action })
    return json({ ok: false, action, code: result.code, message: result.message })
  }

  const routes = Object.keys(DEADLINES).map((action) => [`/api/dsh-power/${action}`, handlerFor(action)])

  let registered = false
  const register = (scope) => {
    if (registered) return
    let scopeHandle
    try {
      scopeHandle = scope.get ? scope.get('connection') : scope.connection
    } catch {
      scopeHandle = undefined
    }
    const fetchFace = scopeHandle && scopeHandle.fetch
    if (fetchFace === undefined || typeof fetchFace.register !== 'function') return
    try {
      scope.effect(() => {
        const disposers = routes.map(([route, handler]) => fetchFace.register({
          path: route,
          methods: ['POST'],
          requestBody: 'buffered',
          fetch: handler,
        }))
        return () => disposers.forEach((dispose) => { if (typeof dispose === 'function') dispose() })
      }, 'dsh-power: routes')
      registered = true
    } catch { /* registration failures stay silent; the UI reports a failed fetch */ }
  }

  register(ctx)
  ctx.inject(['connection'], (scope) => register(scope))
}
