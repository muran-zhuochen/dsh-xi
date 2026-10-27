import fs from 'node:fs'
import zlib from 'node:zlib'

const file = process.argv[2]
const n = Number(process.argv[3] || 12)
const raw = fs.readFileSync(file)

// 会话日志是多个 zstd 帧首尾相接，按魔数切开逐帧解压
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
const cuts = []
for (let i = 0; i < raw.length - 4; i += 1) {
  if (raw[i] === 0x28 && raw[i + 1] === 0xb5 && raw[i + 2] === 0x2f && raw[i + 3] === 0xfd) cuts.push(i)
}
cuts.push(raw.length)
let text = ''
for (let i = 0; i < cuts.length - 1; i += 1) {
  try { text += zlib.zstdDecompressSync(raw.subarray(cuts[i], cuts[i + 1])).toString('utf8') } catch { /* 跳过坏帧 */ }
}
const lines = text.split('\n').filter((l) => l.trim())
console.log('frames:', cuts.length - 1, 'lines:', lines.length)
for (const line of lines.slice(-n)) {
  let e
  try { e = JSON.parse(line) } catch { console.log('(skip)'); continue }
  const t = e.time ? new Date(e.time).toISOString().slice(11, 19) : '--:--:--'
  let extra = ''
  switch (e.type) {
    case 'turn/start': extra = `turn ${e.data?.turn}`; break
    case 'turn/end': extra = JSON.stringify(e.data?.reason); break
    case 'step/start': extra = `turn ${e.data?.turn} step ${e.data?.step}`; break
    case 'assistant/message': {
      const blocks = e.data?.message?.content || []
      extra = blocks.map((b) => (b.type === 'text' ? `text(${String(b.text || '').slice(0, 30)})` : b.type)).join(',')
      break
    }
    case 'tool/call': extra = `${e.data?.name} ${String(e.data?.arguments || '').slice(0, 50)}`; break
    case 'tool/result': extra = e.data?.error ? `ERROR ${JSON.stringify(e.data.error)}` : 'ok'; break
    case 'user/message': extra = (e.data?.content || []).map((b) => (b.type === 'text' ? String(b.text || '').slice(0, 30) : b.type)).join(','); break
    case 'request/header': extra = JSON.stringify(e.data?.header?.config || {}); break
    case 'session': extra = `cwd=${e.cwd} preset=${e.agentPreset}`; break
    default: extra = JSON.stringify(e.data ?? e).slice(0, 110)
  }
  console.log(`${String(e.seq ?? '-').padStart(4)} ${t} ${String(e.type).padEnd(18)} ${extra}`)
}
