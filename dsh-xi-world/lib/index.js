import fs from 'node:fs'
import path from 'node:path'

export const name = 'dsh-xi-world'
export const inject = []

const DEFAULT_DIR = 'E:/Ai-Agent/汐/汐的世界'

/** 只读：把 记忆星系.html 和 memory-graph.json 一起交给客户端，由客户端内嵌渲染。 */
export function apply(ctx, rawConfig = {}) {
  const dir = String(rawConfig.memoryDir || DEFAULT_DIR)
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

  const bundle = async () => {
    const page = fs.readFileSync(path.join(dir, '记忆星系.html'), 'utf8')
    const data = JSON.parse(fs.readFileSync(path.join(dir, 'memory-graph.json'), 'utf8'))
    return json({ ok: true, page, data })
  }
  const handler = async () => {
    try { return await bundle() } catch (err) {
      return json({ ok: false, error: err && err.message ? err.message : String(err) }, 500)
    }
  }

  const routes = [['/api/xi-world/bundle', 'POST', handler]]
  let done = false
  const register = (c, label) => {
    if (done) return
    let face
    try { face = c.get ? c.get('connection') : c.connection } catch { /* 取不到就等注入 */ }
    face = face && face.fetch
    if (face === undefined || typeof face.register !== 'function') return
    try {
      c.effect(() => {
        const offs = routes.map(([p, method, fn]) => face.register({
          path: p, methods: [method], requestBody: 'buffered', fetch: fn,
        }))
        return () => offs.forEach((off) => typeof off === 'function' && off())
      }, `dsh-xi-world: routes (${label})`)
      done = true
    } catch { /* 注册失败不影响 DSH 本身 */ }
  }

  try {
    const direct = ctx.get ? ctx.get('connection') : undefined
    if (direct) register(ctx, 'direct')
  } catch { /* 等注入 */ }
  try { ctx.inject(['connection'], (c) => register(c, 'injected')) } catch { /* 没有 connection 就只留客户端 */ }
}
