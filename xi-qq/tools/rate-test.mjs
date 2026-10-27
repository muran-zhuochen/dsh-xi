import { createLimiter } from '../lib/rate.js'
import { splitChat } from '../lib/text.js'
import { mergeDeep } from '../lib/settings.js'

const out = []
const ok = (name, cond, extra = '') => out.push({ name, pass: !!cond, extra })

// 1. 冷却
let l = createLimiter()
ok('first allowed', l.allow('k', { minIntervalSec: 15 }).ok)
const second = l.allow('k', { minIntervalSec: 15 })
ok('second blocked by cooldown', !second.ok && second.reason === 'cooldown', JSON.stringify(second))

// 2. 每小时上限
l = createLimiter()
const now = Date.now()
ok('cap 1', l.allow('k', { maxPerHour: 3 }, now).ok)
ok('cap 2', l.allow('k', { maxPerHour: 3 }, now + 1000).ok)
ok('cap 3', l.allow('k', { maxPerHour: 3 }, now + 2000).ok)
const fourth = l.allow('k', { maxPerHour: 3 }, now + 3000)
ok('cap blocks 4th', !fourth.ok && fourth.reason === 'hourly', JSON.stringify(fourth))
ok('window slides', l.allow('k', { maxPerHour: 3 }, now + 3600_000 + 1).ok)

// 3. 每日总量
l = createLimiter()
ok('day 1', l.dailyAllow(2).ok)
ok('day 2', l.dailyAllow(2).ok)
const third = l.dailyAllow(2)
ok('day blocks 3rd', !third.ok && third.reason === 'daily', JSON.stringify(third))
ok('day snapshot', l.dailySnapshot().count === 2, JSON.stringify(l.dailySnapshot()))

// 4. 0 = 不限
l = createLimiter()
ok('zero = unlimited', l.allow('k', { maxPerHour: 0, minIntervalSec: 0 }).ok && l.allow('k', {}).ok)

// 5. 分条
const s43 = splitChat('一。二。三。四。', 3)
ok('split 4 -> <=3 chunks', s43.length >= 2 && s43.length <= 3, JSON.stringify(s43))
ok('split 3 -> 3 chunks', splitChat('一。二。三。', 3).length === 3, JSON.stringify(splitChat('一。二。三。', 3)))
ok('split keeps text', splitChat('你好。今天怎么样？', 3).join('') === '你好。今天怎么样？')
ok('split single', splitChat('没有标点', 3).length === 1)
ok('split limit 1', splitChat('一。二。三。', 1).length === 1)

// 6. 深合并
const merged = mergeDeep({ a: 1, n: { x: 1, y: 2 } }, { n: { y: 9 } })
ok('deep merge keeps x', merged.n.x === 1 && merged.n.y === 9, JSON.stringify(merged))

let bad = 0
for (const r of out) {
  if (r.pass) console.log(`ok   ${r.name}`)
  else { bad += 1; console.log(`FAIL ${r.name} ${r.extra}`) }
}
console.log(bad ? `${bad} failed` : `${out.length} passed`)
process.exit(bad ? 1 : 0)
