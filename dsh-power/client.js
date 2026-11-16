window.__ModuleLoader__.load({
  id: 'dsh-power',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    let ReactDOM = null
    try { ReactDOM = require('react-dom') } catch { ReactDOM = null }
    const NS = 'dsh-power'

    const zh = {
      title: '电源',
      minimize: '最小化',
      restart: '重启',
      close: '关闭（彻底退出）',
      restarting: '正在重启…',
      failed: '没成功：',
      'err.no-process': '没找到 DeepSeek Harness 进程',
      'err.no-window': '没找到应用窗口',
      'err.exe-missing': '找不到应用的可执行文件',
      'err.timeout': '操作超时',
      'err.unsupported': '这个系统上做不了',
      'err.powershell-failed': '系统命令报错',
      'err.spawn-failed': '调不起系统命令',
      'err.network': '连不上宿主',
    }

    const en = {
      title: 'Power',
      minimize: 'Minimize',
      restart: 'Restart',
      close: 'Close (quit app)',
      restarting: 'Restarting…',
      failed: 'Failed: ',
      'err.no-process': 'DeepSeek Harness is not running',
      'err.no-window': 'No app window found',
      'err.exe-missing': 'Cannot find the app executable',
      'err.timeout': 'The operation timed out',
      'err.unsupported': 'Not available on this system',
      'err.powershell-failed': 'System command failed',
      'err.spawn-failed': 'Could not start the system command',
      'err.network': 'Cannot reach the host',
    }

    // Menu geometry mirrors the shipped "more actions" menu
    // (4px list padding, 34px rows, radius-lg panel).
    const MENU_WIDTH = 176

    const CSS = `
.dshp-root{display:inline-flex;align-items:center;flex:none}
.dshp-btn{width:28px;height:28px;display:grid;place-items:center;padding:0;border:0;border-radius:8px;
  background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
@media (hover:hover){.dshp-btn:hover,.dshp-btn[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover)}}
.dshp-btn:active{background:var(--dsw-alias-interactive-bg-active,var(--dsw-alias-interactive-bg-hover))}
.dshp-menu{position:fixed;z-index:1200;box-sizing:border-box;padding:4px;border:0;
  border-radius:var(--dsw-radius-lg);background:var(--dsw-specific-menu);
  backdrop-filter:var(--dsw-menu-backdrop-filter,blur(20px));
  --dsw-elevation-stroke-color:var(--dsw-alias-border-l1);
  box-shadow:var(--dsw-elevation-prominent);
  color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;user-select:none;
  font-family:var(--dsw-font-family,inherit)}
.dshp-item{display:flex;align-items:center;gap:6px;width:100%;min-height:34px;padding:6px 8px;
  border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);
  cursor:pointer;font:inherit;font-size:13px;line-height:20px;text-align:left}
@media (hover:hover){.dshp-item:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}}
.dshp-item:disabled{opacity:.4;cursor:not-allowed}
.dshp-sep{height:1px;margin:4px 0;background:var(--dsw-alias-border-l1)}
.dshp-note{padding:4px 8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dshp-err{padding:4px 8px;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary)}
`

    function ensureStyle() {
      const id = 'dsh-power-style'
      if (document.getElementById(id)) return () => {}
      const tag = document.createElement('style')
      tag.id = id
      tag.textContent = CSS
      document.head.appendChild(tag)
      return () => { tag.remove() }
    }

    function PowerGlyph() {
      return h('svg', {
        width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true,
      },
      h('path', { d: 'M12 3.4v8' }),
      h('path', { d: 'M7.7 6.3a7.4 7.4 0 1 0 8.6 0' }))
    }

    function useTranslate(props) {
      const provided = props && typeof props.t === 'function' ? props.t : undefined
      return (key) => {
        if (provided) {
          try {
            const value = provided(key)
            if (typeof value === 'string' && value !== '' && value !== key) return value
          } catch { /* fall through to the bundled dictionary */ }
        }
        return zh[key] ?? key
      }
    }

    function PowerSwitch(props) {
      const t = useTranslate(props)
      const [open, setOpen] = React.useState(false)
      const [pos, setPos] = React.useState(null)
      const [pending, setPending] = React.useState(null)
      const [error, setError] = React.useState(null)
      const btnRef = React.useRef(null)
      const menuRef = React.useRef(null)

      const openMenu = () => {
        const node = btnRef.current
        if (!node) return
        const rect = node.getBoundingClientRect()
        const width = Math.min(MENU_WIDTH, window.innerWidth - 16)
        const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width))
        setPos({ left, top: rect.bottom + 4, width })
        setError(null)
        setOpen(true)
      }

      React.useEffect(() => {
        if (!open) return undefined
        const onPointerDown = (event) => {
          if (btnRef.current && btnRef.current.contains(event.target)) return
          if (menuRef.current && menuRef.current.contains(event.target)) return
          setOpen(false)
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('mousedown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [open])

      const run = async (action) => {
        if (pending) return
        setError(null)
        setPending(action)
        try {
          const response = await fetch('/api/dsh-power/' + action, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}',
          })
          let body = {}
          try { body = await response.json() } catch { body = {} }
          if (body && body.ok === true) {
            setPending(null)
            setOpen(false)
            return
          }
          const code = body && typeof body.code === 'string' ? body.code : 'powershell-failed'
          setError(t('failed') + t('err.' + code))
          setPending(null)
        } catch {
          setError(t('failed') + t('err.network'))
          setPending(null)
        }
      }

      const item = (action, label) => h('button', {
        type: 'button',
        role: 'menuitem',
        className: 'dshp-item',
        disabled: pending !== null,
        onClick: () => { void run(action) },
      }, label)

      const menu = open && pos ? h('div', {
        ref: menuRef,
        className: 'dshp-menu',
        role: 'menu',
        style: { left: pos.left + 'px', top: pos.top + 'px', width: pos.width + 'px' },
      },
      item('minimize', t('minimize')),
      item('restart', t('restart')),
      h('div', { className: 'dshp-sep' }),
      item('quit', t('close')),
      pending === 'restart' ? h('div', { className: 'dshp-note' }, t('restarting')) : null,
      error ? h('div', { className: 'dshp-err' }, error) : null,
      ) : null

      return h('span', { className: 'dshp-root' },
        h('button', {
          ref: btnRef,
          type: 'button',
          className: 'dshp-btn',
          title: t('title'),
          'aria-label': t('title'),
          'aria-haspopup': true,
          'aria-expanded': open,
          onClick: () => {
            if (open) setOpen(false)
            else openMenu()
          },
        }, h(PowerGlyph)),
        menu ? (ReactDOM && typeof ReactDOM.createPortal === 'function'
          ? ReactDOM.createPortal(menu, document.body)
          : menu) : null,
      )
    }

    return {
      name: 'dsh-power',
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ensureStyle(), 'dsh-power: styles')
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-power: dictionaries')
        // The row that owns the bottom-panel toggle; order puts us rightmost in it.
        ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
          name: 'conversation.session.header.utilities',
          id: 'dsh-power',
          order: 1000,
          locale: NS,
        }, PowerSwitch))
      },
    }
  },
})
