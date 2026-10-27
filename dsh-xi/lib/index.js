import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildState, resolveDataDir, DSH_HOME } from './state.js'
import { initPersona, hasPersona } from './persona.js'
import { runMigrations, PLUGIN_VERSION } from './upgrade.js'
import { qqSnapshot, patchQqSettings, readQqSettings, startNapCat, portOpen } from './qqlink.js'

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
  trace('apply-enter dir=' + dataDir)
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

  const stateHandler = async () => json(buildState(ROOT, dataDir))

  const initHandler = async (request) => {
    if (hasPersona(dataDir)) return json({ ok: false, reason: 'has-persona' }, 409)
    const input = await readBody(request)
    const result = initPersona(dataDir, input || {})
    trace('init ' + JSON.stringify(result))
    return json(result)
  }

  // 通道控制：启用开关、自启动开关、手动点火 NapCat
  const channelHandler = async (request) => {
    const input = await readBody(request)
    if ((input.id || 'qq') !== 'qq') return json({ ok: false, reason: 'unknown-channel' }, 404)

    const patch = {}
    if (typeof input.enabled === 'boolean') patch.enabled = input.enabled
    if (typeof input.autostart === 'boolean') patch.autostartNapCat = input.autostart
    if (input.patch && typeof input.patch === 'object' && !Array.isArray(input.patch)) {
      Object.assign(patch, input.patch)
    }
    if (Object.keys(patch).length) {
      const next = patchQqSettings(patch)
      trace(`channel qq patch=${JSON.stringify(patch).slice(0, 200)} -> enabled=${next.enabled} autostart=${next.autostartNapCat}`)
    }

    if (input.action === 'start-napcat') {
      const up = await portOpen()
      if (!up) {
        trace('channel qq: 手动启动 NapCat')
        startNapCat(trace)
        await sleep(2500)
      }
    }
    return json({ ok: true, qq: await qqSnapshot() })
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
      ['/api/dsh-xi/channel', 'POST', channelHandler],
    ]
    try {
      c.effect(() => {
        const offs = routes.map(([p, method, handler]) => face.register({
          path: p, methods: [method], requestBody: 'buffered', fetch: handler,
        }))
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
      fs.mkdirSync(path.join(DSH_HOME, 'xi-qq'), { recursive: true })
      fs.writeFileSync(path.join(DSH_HOME, 'xi-qq', 'dsh-url.txt'), url + '\n')
      trace('dsh-url: 已写入 dsh-url.txt')
    } catch (err) {
      trace('dsh-url failed: ' + err.message)
    }
  }
  const urlTimer = setTimeout(dumpAuthedUrl, 800)

  // 自启动：开关打开时，DSH 起来就把 NapCat 拉起来；NapCat 掉了也顺手补一次
  const ensureNapcat = async (why) => {
    if (!readQqSettings().autostartNapCat) return
    if (await portOpen()) return
    trace(`autostart(${why}): NapCat 不在，点火`)
    startNapCat(trace)
  }
  const bootTimer = setTimeout(() => { void ensureNapcat('boot') }, 3000)
  const watchTimer = setInterval(() => { void ensureNapcat('watch') }, 300000)
  try {
    ctx.effect(() => () => { clearTimeout(bootTimer); clearInterval(watchTimer); clearTimeout(urlTimer) }, 'dsh-xi: napcat autostart')
  } catch { /* 老版本 cordis 没有 effect 时忽略 */ }
}
