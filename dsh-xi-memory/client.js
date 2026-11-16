window.__ModuleLoader__.load({
  id: 'dsh-xi-memory',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const use = React

    const API = '/api/dsh-xi-memory'

    const CSS = `
.xm-root{--xm-line:color-mix(in srgb,currentColor 14%,transparent);--xm-card:color-mix(in srgb,currentColor 4%,transparent);
  --xm-muted:color-mix(in srgb,currentColor 58%,transparent);--xm-dim:color-mix(in srgb,currentColor 42%,transparent);
  --xm-accent:#1f9d8f;height:100%;overflow:auto;padding:22px 26px 48px;font-size:13.5px;line-height:1.7;color:inherit}
.xm-root *{box-sizing:border-box}
.xm-head{display:flex;align-items:baseline;gap:10px;margin-bottom:4px}
.xm-title{font-size:19px;font-weight:650;letter-spacing:.4px}
.xm-sub{color:var(--xm-dim);font-size:12px}
.xm-right{margin-left:auto;display:flex;align-items:center;gap:10px;color:var(--xm-dim);font-size:12px}
.xm-btn{border:1px solid var(--xm-line);background:transparent;color:var(--xm-muted);border-radius:8px;
  padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit}
.xm-btn:hover{color:inherit;border-color:var(--xm-dim)}
.xm-btn.on{border-color:var(--xm-accent);color:var(--xm-accent)}
.xm-sect{margin:22px 0 8px;font-size:11px;letter-spacing:1px;color:var(--xm-dim);font-weight:600}
.xm-search{display:flex;gap:8px;margin-top:10px}
.xm-input{flex:1;padding:8px 10px;border-radius:8px;font:inherit;font-size:13px;color:inherit;background:transparent;
  border:1px solid var(--xm-line)}
.xm-input:focus-visible{outline:2px solid color-mix(in srgb,var(--xm-accent) 60%,transparent);outline-offset:1px}
.xm-list{border:1px solid var(--xm-line);border-radius:12px;overflow:hidden;background:var(--xm-card)}
.xm-row{display:flex;gap:10px;align-items:baseline;padding:9px 14px;border-bottom:1px solid color-mix(in srgb,currentColor 8%,transparent);
  cursor:pointer}
.xm-row:last-child{border-bottom:none}
.xm-row:hover{background:color-mix(in srgb,currentColor 5%,transparent)}
.xm-row .d{font-variant-numeric:tabular-nums;color:var(--xm-muted)}
.xm-row .n{margin-left:auto;color:var(--xm-dim);font-size:12px;white-space:nowrap}
.xm-lines{padding:4px 0 10px;border-bottom:1px solid color-mix(in srgb,currentColor 8%,transparent);
  max-height:360px;overflow:auto}
.xm-line{padding:5px 14px 5px 34px;font-size:12.5px;color:var(--xm-muted);border-left:2px solid transparent}
.xm-line b{color:inherit;font-weight:600}
.xm-line .t{color:var(--xm-dim);font-variant-numeric:tabular-nums;margin-right:6px}
.xm-hit{padding:10px 14px;border-bottom:1px solid color-mix(in srgb,currentColor 8%,transparent)}
.xm-hit:last-child{border-bottom:none}
.xm-hit .meta{color:var(--xm-dim);font-size:11.5px;margin-bottom:3px}
.xm-hit .body{color:var(--xm-muted);font-size:12.5px;word-break:break-word}
.xm-pre{white-space:pre-wrap;word-break:break-word;margin:0;font:inherit;font-size:12.5px;line-height:1.85;
  color:var(--xm-muted);max-height:420px;overflow:auto;padding:12px 14px;border:1px solid var(--xm-line);border-radius:12px;
  background:var(--xm-card)}
.xm-empty{color:var(--xm-dim);padding:16px 14px}
.xm-note{color:var(--xm-dim);font-size:12px;margin-top:8px}
`

    function ensureStyle() {
      if (typeof document === 'undefined') return
      if (document.getElementById('dsh-xi-memory-css')) return
      const style = document.createElement('style')
      style.id = 'dsh-xi-memory-css'
      style.textContent = CSS
      document.head.appendChild(style)
    }

    const kb = (n) => (n >= 1024 ? (n / 1024).toFixed(0) + ' KB' : n + ' B')
    const when = (ms) => (ms ? new Date(ms).toLocaleString('zh-CN', { hour12: false }) : '—')
    const post = (p) => fetch(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })

    function useOverview() {
      const [data, setData] = use.useState(null)
      const [error, setError] = use.useState('')
      const [tick, setTick] = use.useState(0)
      use.useEffect(() => {
        let alive = true
        post(API + '/overview')
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
          .then((j) => { if (alive) { setData(j); setError('') } })
          .catch((e) => { if (alive) setError(e.message || String(e)) })
        return () => { alive = false }
      }, [tick])
      return { data, error, refresh: () => setTick((v) => v + 1) }
    }

    function Search({ onSearch, hits, busy }) {
      const [q, setQ] = use.useState('')
      const submit = () => { if (q.trim() !== '') onSearch(q.trim()) }
      return h('div', null,
        h('div', { className: 'xm-search' },
          h('input', {
            className: 'xm-input', value: q, placeholder: '原话里的一小段，比如「火锅」',
            onChange: (e) => setQ(e.target.value),
            onKeyDown: (e) => { if (e.key === 'Enter') submit() },
          }),
          h('button', { className: 'xm-btn', onClick: submit, disabled: busy }, busy ? '搜…' : '找')),
        hits === null ? null : h('div', { className: 'xm-list', style: { marginTop: 10 } },
          hits.length === 0
            ? h('div', { className: 'xm-empty' }, '没找到。换个词，或者直接翻下面的日子。')
            : hits.map((it, i) => h('div', { key: i, className: 'xm-hit' },
              h('div', { className: 'meta' }, it.time + ' · ' + it.who + ' · ' + it.ref),
              h('div', { className: 'body' }, it.text)))))
    }

    function DayRow({ entry }) {
      const [open, setOpen] = use.useState(false)
      const [lines, setLines] = use.useState(null)
      const toggle = () => {
        const next = !open
        setOpen(next)
        if (next && lines === null) {
          post(API + '/day?day=' + encodeURIComponent(entry.day))
            .then((r) => r.json())
            .then((j) => setLines(j.lines || []))
            .catch(() => setLines([]))
        }
      }
      return h('div', null,
        h('div', { className: 'xm-row', onClick: toggle },
          h('span', { className: 'd' }, entry.day),
          h('span', { className: 'n' }, entry.entries + ' 条 · ' + kb(entry.bytes) + (open ? ' · 收起' : ''))),
        open ? h('div', { className: 'xm-lines' },
          (lines || []).map((l, i) => h('div', { key: i, className: 'xm-line' },
            l.time ? h('span', { className: 't' }, l.time) : null,
            l.who ? h('b', null, l.who + '：') : null,
            l.text))) : null)
    }

    function View() {
      const { data, error, refresh } = useOverview()
      const [hits, setHits] = use.useState(null)
      const [busy, setBusy] = use.useState(false)
      const [showFacts, setShowFacts] = use.useState(false)
      const search = (q) => {
        setBusy(true)
        post(API + '/search?q=' + encodeURIComponent(q) + '&limit=20')
          .then((r) => r.json())
          .then((j) => setHits(j.items || []))
          .catch(() => setHits([]))
          .finally(() => setBusy(false))
      }
      if (error && !data) return h('div', { className: 'xm-root' }, h('div', { className: 'xm-sub' }, '读不到记忆：' + error))
      if (!data) return h('div', { className: 'xm-root' }, h('div', { className: 'xm-sub' }, '读取中…'))
      const last = data.days.length > 0 ? Math.max(...data.days.map((d) => d.mtime)) : 0
      return h('div', { className: 'xm-root' },
        h('div', { className: 'xm-head' },
          h('div', { className: 'xm-title' }, '记忆'),
          h('div', { className: 'xm-sub' }, data.days.length + ' 天 · ' + data.days.reduce((s, d) => s + d.entries, 0) + ' 条 · ' + data.sessions + ' 个会话'),
          h('div', { className: 'xm-right' },
            h('span', null, '最后写入 ' + when(last)),
            h('button', { className: 'xm-btn', onClick: refresh }, '刷新'))),

        h('div', { className: 'xm-sect' }, '找旧话'),
        h(Search, { onSearch: search, hits, busy }),

        h('div', { className: 'xm-sect' }, '按天归档'),
        data.days.length === 0
          ? h('div', { className: 'xm-card' }, h('div', { className: 'xm-empty' }, '还没有归档。聊两句再回来。'))
          : h('div', { className: 'xm-list' }, data.days.map((d) => h(DayRow, { key: d.day, entry: d }))),

        h('div', { className: 'xm-sect' }, '常驻记忆'),
        h('button', { className: 'xm-btn' + (showFacts ? ' on' : ''), onClick: () => setShowFacts(!showFacts) },
          showFacts ? '收起' : '看 MEMORY.md / MOOD.md'),
        showFacts ? h('div', { style: { marginTop: 10 } },
          h('pre', { className: 'xm-pre' }, data.facts || '（空）'),
          h('pre', { className: 'xm-pre', style: { marginTop: 10 } }, data.mood || '（空）')) : null,

        h('div', { className: 'xm-note' }, '归档在 ' + data.archiveDir + '；这个页面只读，改记忆改文件。'))
    }

    function MemoryIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 18
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
      },
        h('path', { d: 'M4 4h9a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z' }),
        h('path', { d: 'M8 8h5M8 12h5M8 16h3' }),
        h('path', { d: 'M19 7v10a3 3 0 0 1-3 3' }))
    }

    function apply(ctx) {
      ensureStyle()
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist', id: 'xi-memory', order: 26, label: () => '记忆',
      }, (props) => h(MemoryIcon, props)))
      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main', key: 'xi-memory',
      }, () => h(View)))
      // 会话页不再挂标签：入口只在左侧边栏。
    }

    return { name: 'dsh-xi-memory', inject: ['slots', 'layout'], apply }
  },
})
