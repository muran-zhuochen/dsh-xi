import path from 'node:path'
import { appendMessage, loadSeen, readRefText, renderMemoryBlock, saveSeen, searchArchive } from './store.js'

export const name = 'dsh-xi-memory'
export const inject = ['tools', 'systemPrompt']

const DEFAULTS = {
  memoryDir: 'E:/Ai-Agent/汐/记忆',
  timeZone: 'Asia/Shanghai',
  partnerName: '阿晚',
  companionName: '汐',
  archiveChats: true,
  injectMemory: true,
  maxInjectChars: 4500,
}

const text = (value) => [{ type: 'text', text: value }]

function resolveConfig(config) {
  const merged = { ...DEFAULTS, ...(config || {}) }
  merged.memoryDir = String(merged.memoryDir)
  merged.archiveDir = path.join(merged.memoryDir, 'archive', 'conversations')
  merged.diaryDir = path.join(merged.memoryDir, 'diary')
  return merged
}

function messageText(event) {
  if (event.type === 'user/message') {
    const data = event.data || {}
    const kind = data.source?.kind
    if (kind !== undefined && kind !== 'user') return ''
    return (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n')
  }
  if (event.type === 'assistant/message') {
    const content = event.data?.message?.content || event.data?.content || []
    return content.filter((c) => c.type === 'text').map((c) => c.text).join('\n')
  }
  return ''
}

export function apply(ctx, rawConfig) {
  const config = resolveConfig(rawConfig)
  const seen = loadSeen(config.archiveDir)

  // 1. 归档：只收对话正文，工具过程和注入的提示词都不进
  if (config.archiveChats) {
    ctx.effect(() => ctx.on('session/event', (session, event) => {
      if (event?.type !== 'user/message' && event?.type !== 'assistant/message') return
      const sessionId = String(session?.id ?? session?.header?.id ?? '')
      const seq = Number(event.seq ?? -1)
      if (sessionId === '') return
      if (seen.has(sessionId) && seq <= Number(seen.get(sessionId))) return
      const body = messageText(event)
      if (body.trim() === '') return
      try {
        appendMessage({
          dir: config.archiveDir,
          timeZone: config.timeZone,
          time: Number(event.time) || Date.now(),
          sessionId,
          who: event.type === 'user/message' ? config.partnerName : config.companionName,
          text: body,
        })
        if (seq >= 0) seen.set(sessionId, seq)
        saveSeen(config.archiveDir, seen)
      } catch { /* 归档失败不挡对话，下次启动会从游标处补 */ }
    }), 'dsh-xi-memory: 归档')
  }

  // 2. 开场注入常驻记忆（只读，不调模型）
  if (config.injectMemory) {
    ctx.effect(() => ctx.systemPrompt.section({
      name: 'xi-memory',
      order: 90,
      interpolate: false,
      text: () => renderMemoryBlock(config.memoryDir, config.maxInjectChars),
    }), 'dsh-xi-memory: 注入')
  }

  // 3. 两个检索工具
  const findTool = {
    name: 'memory_find',
    description: '在汐自己的记忆里按字面找旧话：聊天归档（archive/conversations）和日记（diary）。一次只回几条摘要，要更多翻页或读原文。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '原话里的一小段字面文字，区分大小写；不是 SQL 或搜索语法。' },
        kind: { type: 'string', enum: ['conversation', 'diary'], description: '只找聊天，或只找日记；不填就两边都找。' },
        from: { type: 'string', description: '起始日期 YYYY-MM-DD，含当天。' },
        to: { type: 'string', description: '结束日期 YYYY-MM-DD，含当天。' },
        limit: { type: 'integer', description: '这一页返回几条，默认 8，最多 50。' },
        cursor: { type: 'integer', description: '上一页返回的 nextCursor。' },
      },
      required: ['query'],
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ref: { type: 'string' },
                time: { type: 'string' },
                who: { type: 'string' },
                text: { type: 'string' },
              },
              required: ['ref', 'time', 'who', 'text'],
            },
          },
          nextCursor: { type: 'integer' },
          files: { type: 'integer' },
        },
        required: ['items', 'files'],
      },
      render: (_args, value) => {
        if (value.items.length === 0) return text('没找到。可能没聊过，也可能用了别的说法；换个词或放宽日期再试。')
        const lines = value.items.map((it) => `- ${it.time} · ${it.who} · ${it.ref}\n  ${it.text}`)
        const tail = value.nextCursor === undefined ? '' : `\n\n还有更多，用 cursor=${value.nextCursor} 翻下一页。`
        return text(`找到 ${value.items.length} 条（扫了 ${value.files} 个文件）：\n${lines.join('\n')}${tail}`)
      },
    },
    execute: async (args) => {
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 8))
      return searchArchive({
        dirs: { conversations: config.archiveDir, diary: config.diaryDir },
        query: args.query,
        kind: args.kind,
        from: args.from,
        to: args.to,
        limit,
        cursor: Number(args.cursor) || 0,
      })
    },
  }

  const readTool = {
    name: 'memory_read',
    description: '读 memory_find 给出的 ref 指向的原文片段，按字符分页。',
    parameters: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'memory_find 返回的 ref，形如 diary/2026-10-27.md:12。' },
        offset: { type: 'integer', description: '从这个 ref 起跳过几个字符，默认 0。' },
        limit: { type: 'integer', description: '这一页最多几个字符，默认 2000，最多 16000。' },
      },
      required: ['ref'],
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ref: { type: 'string' },
          text: { type: 'string' },
          nextOffset: { type: 'integer' },
          end: { type: 'boolean' },
        },
        required: ['ref', 'text', 'end'],
      },
      render: (_args, value) => text(value.end
        ? value.text
        : `${value.text}\n\n（还没完，用 offset=${value.nextOffset} 继续）`),
    },
    execute: async (args) => readRefText({
      memoryDir: config.memoryDir,
      ref: args.ref,
      offset: Number(args.offset) || 0,
      limit: Math.max(1, Math.min(16000, Number(args.limit) || 2000)),
    }),
  }

  ctx.effect(() => {
    const disposers = [findTool, readTool].map((tool) => ctx.tools.register(tool))
    return () => { for (const dispose of disposers) { try { dispose?.() } catch { /* 已卸载 */ } } }
  }, 'dsh-xi-memory: 工具')
}
