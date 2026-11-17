// 同源反代：把 OpenQQ 的控制台搬到 DSH 的 /openqq 下面，好让「接入」页能嵌着看。
// 它自己的响应头写着 X-Frame-Options: DENY + frame-ancestors 'none'，所以这里全部重发自己的头。
// 页面用的是根路径（/app.js、/api/...），所以 HTML 和 JS 里的绝对路径要改写成 /openqq/...。

import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const STATE_FILE = path.join(DSH_HOME, 'openqq-webui.json')
const LOG_FILE = path.join(DSH_HOME, 'xi.log')

function traceProxy(message) {
  try { fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} openqq-proxy ${message}\n`) } catch { /* 诊断用 */ }
}
const UPSTREAM = 'http://127.0.0.1:17860'
// DSH 的精确 Fetch 路由只收 /api/ 开头的路径，所以挂在这下面。
export const PREFIX = '/api/xi-openqq'

/** 启动器写下的当次密钥与进程信息；没有就返回 null。 */
export function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return null
  }
}

function rewriteHtml(text) {
  return text.replace(/(href|src)="\//g, `$1="${PREFIX}/`)
}

function rewriteJs(text) {
  return text
    .replace(/(["'])\/api\//g, `$1${PREFIX}/api/`)
    .replace(/(["'])\/logo\.svg/g, `$1${PREFIX}/logo.svg`)
}

/** CSS 里的 url(/x) 也得跟着挪，不然图标、字体全跑到 DSH 根上 404。 */
function rewriteCss(text) {
  return text.replace(/url\((['"]?)\//g, `url($1${PREFIX}/`)
}

/** 把一次请求转给 OpenQQ，并按内容类型改写正文。 */
export async function proxy(request, upstreamPath) {
  const state = readState()
  const headers = {}
  if (state?.token) headers.authorization = `Bearer ${state.token}`
  const accept = request.headers.get('accept')
  if (accept) headers.accept = accept
  const contentType = request.headers.get('content-type')
  if (contentType) headers['content-type'] = contentType

  const init = { method: request.method || 'GET', headers, redirect: 'manual' }
  if (init.method !== 'GET' && init.method !== 'HEAD') {
    try {
      const body = Buffer.from(await request.arrayBuffer())
      if (body.length > 0) init.body = body
    } catch { /* 没正文 */ }
  }

  let res
  try {
    res = await fetch(`${UPSTREAM}${upstreamPath}`, init)
  } catch (err) {
    traceProxy(`${upstreamPath} 502 ${String(err?.message || err)}`)
    return new Response(JSON.stringify({
      error: '连不上 OpenQQ 控制台',
      hint: '先在 E:\\Ai-Agent\\快捷方式\\ 里双击「启动QQ」，等它打出 WebUI 地址',
      detail: String(err?.message || err),
    }), { status: 502, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
  }

  const type = res.headers.get('content-type') || ''
  const raw = Buffer.from(await res.arrayBuffer())
  traceProxy(`${upstreamPath} ${res.status} ${type.split(';')[0]} ${raw.length}B`)
  const out = { 'content-type': type || 'application/octet-stream', 'cache-control': 'no-store' }
  if (/text\/html/i.test(type)) return new Response(rewriteHtml(raw.toString('utf8')), { status: res.status, headers: out })
  if (/text\/css/i.test(type)) return new Response(rewriteCss(raw.toString('utf8')), { status: res.status, headers: out })
  if (/javascript|ecmascript|text\/plain/i.test(type)) return new Response(rewriteJs(raw.toString('utf8')), { status: res.status, headers: out })
  return new Response(raw, { status: res.status, headers: out })
}

function portOpen(port, timeoutMs = 1200) {  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port })
    const done = (value) => { try { socket.destroy() } catch { /* 已关 */ } ; resolve(value) }
    socket.setTimeout(timeoutMs, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

/** 给「接入」页用的状态：控制台、协议端、密钥、进程。 */
export async function probe() {
  const state = readState()
  const [webui, onebot] = await Promise.all([portOpen(17860), portOpen(3001)])
  return {
    webui,
    onebot,
    token: Boolean(state?.token),
    phase: state?.phase || '',
    pid: state?.pid || 0,
    at: state?.at || '',
    url: state?.url || '',
  }
}
