// 滑动窗口限流 + 每日总条数。纯内存，重启清零（重启本身也等于闸门重置）。
const HOUR = 3600_000

const todayKey = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function createLimiter() {
  const hits = new Map() // key -> timestamps[]
  let day = { key: todayKey(), count: 0 }

  const bucket = (key, now) => {
    const list = (hits.get(key) || []).filter((t) => now - t < HOUR)
    hits.set(key, list)
    return list
  }

  /**
   * @param {string} key 例如 private:123 / group:456:mention
   * @param {{minIntervalSec?: number, maxPerHour?: number}} policy 0 或省略 = 不限
   */
  function allow(key, policy = {}, now = Date.now()) {
    const list = bucket(key, now)
    const minGap = (Number(policy.minIntervalSec) || 0) * 1000
    const cap = Number(policy.maxPerHour) || 0
    if (minGap && list.length) {
      const wait = minGap - (now - list[list.length - 1])
      if (wait > 0) return { ok: false, reason: 'cooldown', waitMs: wait }
    }
    if (cap && list.length >= cap) return { ok: false, reason: 'hourly', used: list.length }
    list.push(now)
    return { ok: true, used: list.length }
  }

  function dailyAllow(max, now = Date.now()) {
    if (day.key !== todayKey(now)) day = { key: todayKey(now), count: 0 }
    const cap = Number(max) || 0
    if (cap && day.count >= cap) return { ok: false, reason: 'daily', used: day.count }
    day.count += 1
    return { ok: true, used: day.count }
  }

  function dailySnapshot() {
    if (day.key !== todayKey()) day = { key: todayKey(), count: 0 }
    return { date: day.key, count: day.count }
  }

  return { allow, dailyAllow, dailySnapshot }
}
