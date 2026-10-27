import fs from 'node:fs'
import path from 'node:path'

/**
 * 升级模块：代码与数据分离，数据在用户目录，不随代码升级迁移。
 * 每次启动按版本号补跑没跑过的迁移，跑完写回；迁移必须幂等、只做文件操作、不调模型。
 */
const MIGRATIONS = [
  {
    version: '0.1.0',
    describe: '初始化状态文件',
    run(state) {
      state.createdAt ||= new Date().toISOString()
      state.migrations ||= {}
    },
  },
  {
    version: '0.2.0',
    describe: '左侧边栏主页与双数据源',
    run(state) {
      state.sidebarEntry ||= true
    },
  },
  {
    version: '0.3.0',
    describe: '人物格式化与首次引导',
    run(state) {
      state.onboarding ||= true
    },
  },
  {
    version: '0.4.0',
    describe: 'QQ 通道接入（开关与自启动由控制台管，配置在 ~/.dsh/xi-qq）',
    run(state) {
      state.channels ||= {}
      state.channels.qq = { via: 'dsh-xi-qq' }
    },
  },
]

export const PLUGIN_VERSION = '0.7.0'

export function runMigrations(log = () => {}, dataDir) {
  if (!dataDir) return { version: '0.0.0', migrations: {} }
  const file = path.join(dataDir, '.plugin-state.json')
  let state
  try { state = JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch { state = { version: '0.0.0', migrations: {} } }

  let changed = false
  for (const m of MIGRATIONS) {
    if (state.migrations[m.version]) continue
    try {
      m.run(state)
      state.migrations[m.version] = new Date().toISOString()
      changed = true
      log(`[dsh-xi] migration ${m.version}: ${m.describe}`)
    } catch (err) {
      log(`[dsh-xi] migration ${m.version} failed: ${err.message}`)
    }
  }
  if (state.version !== PLUGIN_VERSION) { state.version = PLUGIN_VERSION; changed = true }
  if (changed) {
    try {
      fs.mkdirSync(dataDir, { recursive: true })
      fs.writeFileSync(file, JSON.stringify(state, null, 2))
    } catch { /* read-only fs: skip */ }
  }
  return state
}
