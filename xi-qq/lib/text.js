// 把 OneBot 的 message 字段（数组或 CQ 字符串）摊平成纯文本。

const CQ = /\[CQ:([^\]]*)\]/g

function cqToText(inner) {
  const [name, ...rest] = String(inner).split(',')
  const args = {}
  for (const kv of rest) {
    const i = kv.indexOf('=')
    if (i > 0) args[kv.slice(0, i)] = kv.slice(i + 1)
  }
  switch (name) {
    case 'face': return '[表情]'
    case 'mface': return '[表情]'
    case 'image': return '[图片]'
    case 'record': return '[语音]'
    case 'video': return '[视频]'
    case 'file': return '[文件]'
    case 'at': return args.qq === 'all' ? '@全体成员' : `@${args.qq || ''}`
    case 'reply': return ''
    default: return ''
  }
}

function decodeCq(text) {
  return String(text)
    .replace(/&#91;/g, '[').replace(/&#93;/g, ']').replace(/&#44;/g, ',')
    .replace(/&amp;/g, '&')
}

export function extractText(message) {
  if (typeof message === 'string') {
    return decodeCq(String(message).replace(CQ, (_, inner) => cqToText(inner)))
      .replace(/\r/g, '')
      .trim()
  }
  if (!Array.isArray(message)) return ''
  const parts = []
  for (const seg of message) {
    if (!seg || typeof seg !== 'object') continue
    const data = seg.data || {}
    switch (seg.type) {
      case 'text': parts.push(data.text || ''); break
      case 'at': parts.push(data.qq === 'all' ? '@全体成员' : `@${data.qq || ''}`); break
      case 'image': parts.push('[图片]'); break
      case 'face': case 'mface': parts.push('[表情]'); break
      case 'record': parts.push('[语音]'); break
      case 'video': parts.push('[视频]'); break
      case 'file': parts.push('[文件]'); break
      default: break
    }
  }
  return parts.join('').replace(/\r/g, '').trim()
}

export function isAtSelf(message, selfId) {
  if (!selfId) return false
  if (!Array.isArray(message)) {
    return String(message).includes(`[CQ:at,qq=${selfId}`)
  }
  return message.some((seg) => seg && seg.type === 'at' && String(seg.data?.qq) === String(selfId))
}

// 去掉 markdown 记号，QQ 不渲染。
export function toPlain(text) {
  let s = String(text ?? '')
  s = s.replace(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g, (_, body) => body.trim())
  s = s.replace(/`([^`\n]+)`/g, '$1')
  s = s.replace(/^#{1,6}\s+/gm, '')
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1')
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
  s = s.replace(/~~([^~]+)~~/g, '$1')
  s = s.replace(/^\s*[-*+]\s+/gm, '· ')
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1（$2）')
  s = s.replace(/\n{3,}/g, '\n\n')
  return s.trim()
}

export function splitText(text, max) {  const limit = Math.max(200, Number(max) || 1500)
  if (text.length <= limit) return [text]
  const out = []
  let rest = text
  while (rest.length > limit) {
    let cut = rest.lastIndexOf('\n', limit)
    if (cut < limit * 0.5) cut = limit
    out.push(rest.slice(0, cut).trimEnd())
    rest = rest.slice(cut).replace(/^\n+/, '')
  }
  if (rest.trim()) out.push(rest.trim())
  return out
}

/**
 * 聊天气泡切分：按句末标点断，最多 maxChunks 条，模拟人分几次打完。
 * 一条都没断出来就原样返回。
 */
export function splitChat(text, maxChunks = 3) {
  const raw = String(text ?? '').trim()
  if (!raw) return []
  const limit = Math.max(1, Math.min(6, Number(maxChunks) || 3))
  if (limit === 1) return [raw]

  const parts = raw
    .split(/(?<=[。！？!?…~～\n])/)
    .map((x) => x.trim())
    .filter(Boolean)
  if (parts.length <= 1) return [raw]

  const per = Math.ceil(parts.length / limit)
  const out = []
  for (let i = 0; i < parts.length; i += per) {
    out.push(parts.slice(i, i + per).join(''))
  }
  return out.slice(0, limit).map((x) => x.trim()).filter(Boolean)
}
