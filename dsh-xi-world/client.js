window.__ModuleLoader__.load({
  id: 'dsh-xi-world',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const use = React

    const CSS = `
.xg-root{height:100%;padding:0;margin:0;background:#0a0d14;overflow:hidden}
.xg-frame{display:block;width:100%;height:100%;border:0;background:#0a0d14}
.xg-msg{height:100%;display:grid;place-items:center;color:#8b93a7;font-size:13px;background:#0a0d14}
.xg-err{color:#ff8a80}
`

    function ensureStyle() {
      const id = 'dsh-xi-world-style'
      if (document.getElementById(id)) return
      const s = document.createElement('style')
      s.id = id
      s.textContent = CSS
      document.head.appendChild(s)
    }

    function Icon(props) {
      const size = typeof props.size === 'number' ? props.size : 18
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round',
      },
        h('circle', { cx: 12, cy: 12, r: 1.8 }),
        h('ellipse', { cx: 12, cy: 12, rx: 9, ry: 3.6, transform: 'rotate(-25 12 12)' }),
        h('ellipse', { cx: 12, cy: 12, rx: 9, ry: 3.6, transform: 'rotate(35 12 12)' }))
    }

    function View() {
      const [state, setState] = use.useState({ loading: true, error: '', url: '' })
      use.useEffect(() => {
        let alive = true
        let url = ''
        ;(async () => {
          try {
            const r = await fetch('/api/xi-world/bundle', {
              method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
            })
            if (!r.ok) throw new Error('HTTP ' + r.status)
            const j = await r.json()
            if (!j.ok) throw new Error(j.error || '读取失败')
            // 数据直接内嵌，iframe 里不再发请求；转义 < 防止正文里出现 </script>
            const payload = JSON.stringify(j.data).replace(/</g, '\\u003c')
            const inject = '<script>window.__GALAXY_DATA = ' + payload + ';<\/script>'
            // 用函数式替换：正文里的 $ 不会被 replace 当成 $& / $' 展开
            const page = String(j.page).replace('<script>', () => inject + '<script>')
            url = URL.createObjectURL(new Blob([page], { type: 'text/html;charset=utf-8' }))
            if (alive) setState({ loading: false, error: '', url })
          } catch (err) {
            if (alive) setState({ loading: false, error: err && err.message ? err.message : String(err), url: '' })
          }
        })()
        return () => { alive = false; if (url) URL.revokeObjectURL(url) }
      }, [])

      return h('div', { className: 'xg-root' },
        state.loading ? h('div', { className: 'xg-msg' }, '正在载入汐的世界…') : null,
        state.error ? h('div', { className: 'xg-msg xg-err' }, '读取失败：' + state.error) : null,
        state.url ? h('iframe', { className: 'xg-frame', src: state.url, title: '汐的世界' }) : null)
    }

    function apply(ctx) {
      ensureStyle()
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist', id: 'galaxy', order: 26, label: () => '汐的世界',
      }, (props) => h(Icon, props)))
      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main', key: 'galaxy',
      }, () => h(View)))
    }

    return { name: 'dsh-xi-world', inject: ['slots', 'layout'], apply }
  },
})
