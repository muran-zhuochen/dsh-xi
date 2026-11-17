import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildState, resolveDataDir, resolvePersonaDir, DSH_HOME } from './state.js'
import { initPersona, hasPersona } from './persona.js'
import { runMigrations, PLUGIN_VERSION } from './upgrade.js'
import * as OpenQQ from './openqq.js'

export const name = 'dsh-xi'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOG = path.join(DSH_HOME, 'xi.log')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function trace(msg) {
  try {
    fs.mkdirSync(DSH_HOME, { recursive: true })
    fs.appendFileSync(LOG, `${new Date().toISOString()} ${msg}\n`)
  } catch { /* 诊断用，失败无妨 */ }
}

export function apply(ctx, config) {
  const dataDir = resolveDataDir(config || {})
  const personaDir = resolvePersonaDir(config || {}, dataDir)
  trace('apply-enter dir=' + dataDir + ' persona=' + personaDir)
  try {
    runMigrations((m) => trace('migration: ' + m), dataDir)
  } catch (err) {
    trace('migrations-threw ' + err.message)
  }

  const json = (body, status = 200) => Response.json(body, {
    status, headers: { 'cache-control': 'no-store' },
  })

  const readBody = async (request) => {
    try { return await request.json() } catch { return {} }
  }

  const stateHandler = async () => json(buildState(ROOT, dataDir, personaDir))

  const accessHandler = async () => {
    const status = await OpenQQ.probe()
    return json({ openqq: status, prefix: OpenQQ.PREFIX })
  }

  const initHandler = async (request) => {
    if (hasPersona(personaDir)) return json({ ok: false, reason: 'has-persona' }, 409)
    const input = await readBody(request)
    const result = initPersona(personaDir, dataDir, input || {})
    trace('init ' + JSON.stringify(result))
    return json(result)
  }

  let done = false
  const register = (c, label) => {
    if (done) return
    let face
    try { face = c.get ? c.get('connection') : c.connection } catch (err) { trace(label + ' get-threw ' + err.message) }
    face = face && face.fetch
    if (face === undefined || typeof face.register !== 'function') {
      trace(label + ' no-fetch-face')
      return
    }
    const routes = [
      ['/api/dsh-xi/state', 'POST', stateHandler],
      ['/api/dsh-xi/init', 'POST', initHandler],
      ['/api/dsh-xi/access', 'GET', accessHandler],
      [`${OpenQQ.PREFIX}`, 'GET', (request) => OpenQQ.proxy(request, '/')],
      [`${OpenQQ.PREFIX}/app.js`, 'GET', (request) => OpenQQ.proxy(request, '/app.js')],
      [`${OpenQQ.PREFIX}/styles.css`, 'GET', (request) => OpenQQ.proxy(request, '/styles.css')],
      [`${OpenQQ.PREFIX}/theme.css`, 'GET', (request) => OpenQQ.proxy(request, '/theme.css')],
      [`${OpenQQ.PREFIX}/logo.svg`, 'GET', (request) => OpenQQ.proxy(request, '/logo.svg')],
    ]
    for (const apiPath of ['action', 'check', 'config', 'metrics', 'start', 'stream']) {
      for (const method of ['GET', 'POST']) {
        routes.push([`${OpenQQ.PREFIX}/api/${apiPath}`, method, (request) => OpenQQ.proxy(request, `/api/${apiPath}`)])
      }
    }
    try {
      c.effect(() => {
        const offs = []
        for (const [p, method, handler] of routes) {
          try {
            offs.push(face.register({ path: p, methods: [method], requestBody: 'buffered', fetch: handler }))
          } catch (err) {
            trace(`route-skip ${p} ${method}: ${err.message}`)
          }
        }
        trace(`routes registered ${offs.length}/${routes.length}`)
        return () => offs.forEach((off) => typeof off === 'function' && off())
      }, 'dsh-xi: routes')
      done = true
      trace(label + ' registered ' + routes.map((r) => r[0]).join(','))
    } catch (err) {
      trace(label + ' register-threw ' + err.message)
    }
  }

  try {
    const direct = ctx.get ? ctx.get('connection') : undefined
    if (direct) register(ctx, 'direct')
    else trace('no-direct-connection')
  } catch (err) {
    trace('direct-get-threw ' + err.message)
  }

  try {
    ctx.inject(['connection'], (c) => register(c, 'injected'))
  } catch (err) {
    trace('inject-threw ' + err.message)
  }

  // 把带 token 的本地地址写到文件，供外挂浏览器（Playwright MCP）打开真实面板。
  // 只写本机用户目录，日志里不落 token。
  const dumpAuthedUrl = () => {
    try {
      const conn = ctx.get ? ctx.get('connection') : undefined
      const app = ctx.get ? ctx.get('webApp') : undefined
      const base = app?.getAdvertisedUrl?.() || ''
      const url = base && conn?.authenticatedUrl ? conn.authenticatedUrl(base) : ''
      if (!url) { trace('dsh-url: 拿不到'); return }
      fs.mkdirSync(path.join(DSH_HOME, 'xi'), { recursive: true })
      fs.writeFileSync(path.join(DSH_HOME, 'xi', 'dsh-url.txt'), url + '\n')
      trace('dsh-url: 已写入 dsh-url.txt')
    } catch (err) {
      trace('dsh-url failed: ' + err.message)
    }
  }
  const urlTimer = setTimeout(dumpAuthedUrl, 800)

  try {
    ctx.effect(() => () => { clearTimeout(urlTimer) }, 'dsh-xi: dsh-url dump')
  } catch { /* 老版本 cordis 没有 effect 时忽略 */ }
}
