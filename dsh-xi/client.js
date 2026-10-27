window.__ModuleLoader__.load({
  id: 'dsh-xi',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const use = React

    const CSS = `
.xi-root{--xi-line:color-mix(in srgb,currentColor 14%,transparent);--xi-card:color-mix(in srgb,currentColor 4%,transparent);
  --xi-muted:color-mix(in srgb,currentColor 58%,transparent);--xi-dim:color-mix(in srgb,currentColor 42%,transparent);
  --xi-accent:#1f9d8f;--xi-amber:#b7791f;--xi-rose:#c53030;--xi-violet:#7c5cd6;
  height:100%;overflow:auto;padding:22px 26px 48px;font-size:13.5px;line-height:1.6;color:inherit}
.xi-root *{box-sizing:border-box}
.xi-head{display:flex;align-items:baseline;gap:10px;margin-bottom:16px}
.xi-title{font-size:19px;font-weight:650;letter-spacing:.5px}
.xi-sub{color:var(--xi-dim);font-size:12px}
.xi-right{margin-left:auto;display:flex;align-items:center;gap:10px;color:var(--xi-dim);font-size:12px}
.xi-btn{border:1px solid var(--xi-line);background:transparent;color:var(--xi-muted);
  border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit}
.xi-btn:hover{color:inherit;border-color:var(--xi-dim)}
.xi-tabs{display:flex;gap:2px;border-bottom:1px solid var(--xi-line);margin-bottom:18px;overflow-x:auto}
.xi-tab{border:none;background:none;font-family:inherit;color:var(--xi-dim);padding:9px 12px;
  border-bottom:2px solid transparent;cursor:pointer;font-size:13px;white-space:nowrap}
.xi-tab.on{color:inherit;border-bottom-color:var(--xi-accent);font-weight:600}
.xi-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
.xi-card{border:1px solid var(--xi-line);background:var(--xi-card);border-radius:12px;padding:14px 16px}
.xi-card h4{margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:.8px;color:var(--xi-dim)}
.xi-click{cursor:pointer;transition:border-color .15s ease,background .15s ease}
.xi-click:hover{border-color:color-mix(in srgb,currentColor 28%,transparent);
  background:color-mix(in srgb,currentColor 6%,transparent)}
.xi-click:focus-visible{outline:2px solid light-dark(#2563eb,#7aa7ff);outline-offset:2px}
.xi-big{font-size:24px;font-weight:650;letter-spacing:.3px}
.xi-muted{color:var(--xi-muted)}
.xi-dim{color:var(--xi-dim);font-size:12px}
.xi-accent{color:var(--xi-accent)}.xi-amber{color:var(--xi-amber)}.xi-rose{color:var(--xi-rose)}
.xi-bar{height:6px;border-radius:99px;background:color-mix(in srgb,currentColor 10%,transparent);margin-top:12px;overflow:hidden}
.xi-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#1f9d8f,#5eead4)}
.xi-sect{margin:22px 0 8px;font-size:11px;letter-spacing:1px;color:var(--xi-dim);font-weight:600}
.xi-table{width:100%;border-collapse:collapse;font-size:13px}
.xi-table th{text-align:left;font-weight:500;font-size:11px;letter-spacing:.2px;color:var(--xi-dim);
  padding:6px 8px;border-bottom:1px solid var(--xi-line)}
.xi-table td{padding:8px;border-bottom:1px solid color-mix(in srgb,currentColor 8%,transparent);vertical-align:top}
.xi-table tr:hover td{background:color-mix(in srgb,currentColor 3%,transparent)}
.xi-w{display:inline-block;min-width:20px;text-align:center;font-size:11px;border-radius:5px;padding:0 5px;border:1px solid}
.xi-w3{color:var(--xi-amber);border-color:color-mix(in srgb,var(--xi-amber) 45%,transparent)}
.xi-w2{color:var(--xi-accent);border-color:color-mix(in srgb,var(--xi-accent) 45%,transparent)}
.xi-w1{color:var(--xi-dim);border-color:var(--xi-line)}
.xi-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--xi-line);border-radius:99px;
  padding:3px 10px;font-size:12px;color:var(--xi-muted);margin:0 6px 6px 0}
.xi-dot{width:6px;height:6px;border-radius:50%;background:var(--xi-dim)}
.xi-dot.ready{background:var(--xi-accent)}.xi-dot.planned{background:var(--xi-amber)}
.xi-pre{white-space:pre-wrap;word-break:break-word;margin:0;font-size:12.5px;line-height:1.8;color:var(--xi-muted);font-family:inherit}
.xi-note{border-left:2px solid color-mix(in srgb,var(--xi-accent) 45%,transparent);padding:6px 12px;
  color:var(--xi-muted);font-size:12px;margin:10px 0}
.xi-bars{display:flex;align-items:flex-end;gap:8px;height:110px;margin-top:12px}
.xi-bars .b{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px}
.xi-bars .b i{width:100%;border-radius:4px 4px 0 0;background:color-mix(in srgb,currentColor 18%,transparent);min-height:3px}
.xi-bars .b span{font-size:10px;color:var(--xi-dim)}
.xi-empty{color:var(--xi-dim);padding:16px 0}
/* 开关：关=白轨，开=蓝轨，圆形滑块左右滑动。
   边框/阴影用 light-dark() 跟着宿主声明的 color-scheme 走：
   浅色主题是黑边，深色主题自动换成浅色描边，不然黑边贴在深底上等于没有边。 */
.xi-switch{position:relative;width:46px;height:26px;border-radius:99px;padding:0;flex:0 0 auto;
  cursor:pointer;background:light-dark(#fff,#f5f5f7);
  border:1.5px solid light-dark(#141414,#e4e4ea);
  box-shadow:0 1px 2px light-dark(rgba(0,0,0,.28),rgba(0,0,0,.55)),
             inset 0 1px 3px light-dark(rgba(0,0,0,.10),rgba(0,0,0,.18));
  transition:background .22s ease,border-color .22s ease,box-shadow .22s ease}
.xi-switch.on{background:light-dark(#2563eb,#3b82f6);
  border-color:light-dark(#141414,#c7d7fb);
  box-shadow:0 1px 3px light-dark(rgba(0,0,0,.34),rgba(0,0,0,.6)),
             inset 0 1px 3px light-dark(rgba(0,0,0,.18),rgba(0,0,0,.22))}
.xi-switch .knob{position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;
  background:#fff;border:1.5px solid light-dark(#141414,#202024);
  box-shadow:0 1px 3px light-dark(rgba(0,0,0,.38),rgba(0,0,0,.55));
  transition:left .28s cubic-bezier(.34,1.42,.64,1),transform .16s ease}
.xi-switch.on .knob{left:23px}
.xi-switch:active .knob{transform:scale(.9)}
.xi-switch[disabled]{opacity:.55;cursor:default}
.xi-state{margin-left:auto;font-size:12px;color:var(--xi-dim);white-space:nowrap}
.xi-state.on{color:light-dark(#2563eb,#7aa7ff);font-weight:600}
.xi-state.pop{animation:xi-pop .3s ease}
@keyframes xi-pop{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.xi-row{display:flex;align-items:center;gap:10px;margin-top:10px}
.xi-field{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}
.xi-field>span:first-child{min-width:104px;color:var(--xi-dim);font-size:12px}
.xi-num{width:88px;padding:5px 8px;border-radius:8px;font:inherit;font-size:12.5px;
  border:1px solid light-dark(#141414,#e4e4ea);background:light-dark(#fff,transparent);color:inherit}
.xi-num:focus-visible{outline:2px solid light-dark(#2563eb,#7aa7ff);outline-offset:1px}
.xi-num::-webkit-outer-spin-button,.xi-num::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.xi-num{appearance:textfield;-moz-appearance:textfield}
.xi-kv{display:flex;flex-wrap:wrap;gap:18px;margin-top:6px}
.xi-kv div{font-size:12px;color:var(--xi-dim)}
.xi-kv b{display:block;font-size:15px;font-weight:600;color:inherit;margin-top:2px}
`

    function ensureStyle() {
      // 已存在的样式表也要覆盖：插件热替换不会重刷页面，
      // 只注入一次的话旧 CSS 会一直压着新规则。
      const old = document.getElementById('dsh-xi-style')
      if (old) {
        if (old.textContent !== CSS) old.textContent = CSS
        return
      }
      const s = document.createElement('style')
      s.id = 'dsh-xi-style'
      s.textContent = CSS
      document.head.appendChild(s)
    }

    const esc = (v) => String(v ?? '')
    const money = (n) => '¥' + Number(n || 0).toFixed(3)
    const badge = (n) => h('span', { className: 'xi-w xi-w' + n }, String(n))

    // 两个数据源：先试宿主接口（插件宿主半侧正常时），失败再退到独立控制台（本机 57321）。
    const SOURCES = ['api/dsh-xi/state', 'http://127.0.0.1:57321/api/state']

    function useData() {
      const [data, setData] = use.useState(null)
      const [error, setError] = use.useState(null)
      const [base, setBase] = use.useState(SOURCES[0])
      const load = use.useCallback(async () => {
        let last = '没有可用的数据源'
        for (const url of SOURCES) {
          try {
            const r = await fetch(url, {
              method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
              cache: 'no-store',
            })
            if (!r.ok) { last = 'HTTP ' + r.status + ' · ' + url; continue }
            setData(await r.json())
            setBase(url)
            setError(null)
            return
          } catch (e) {
            last = (e.message || String(e)) + ' · ' + url
          }
        }
        setError(last)
      }, [])
      use.useEffect(() => {
        load()
        const t = setInterval(load, 20000)
        return () => clearInterval(t)
      }, [load])
      return { data, error, load, base }
    }

    function Overview({ s }) {
      const status = s.mood.status
      const cls = status === '不耐烦' || status === '低落' ? 'xi-rose'
        : status === '高兴' ? 'xi-amber' : 'xi-accent'
      const pct = Math.min(100, (s.cost.today / 1) * 100)
      const channels = s.extensions.filter((x) => x.type === 'channel')
      const qq = (s.channels && s.channels.qq) || null
      return h('div', null,
        h('div', { className: 'xi-grid' },
          h('div', { className: 'xi-card' },
            h('h4', null, '此刻'),
            h('div', { className: 'xi-big ' + cls }, status),
            h('div', { className: 'xi-muted', style: { marginTop: 4 } }, s.mood.reason || '没事发生'),
            h('div', { className: 'xi-dim', style: { marginTop: 8 } }, '到期 ' + (s.mood.expiry || '—'))),
          h('div', { className: 'xi-card' },
            h('h4', null, '今日花费'),
            h('div', { className: 'xi-big' }, money(s.cost.today)),
            h('div', { className: 'xi-dim' }, '余额 ' + money(s.cost.balance) + ' · 单次红线 ¥1'),
            h('div', { className: 'xi-bar' }, h('i', { style: { width: pct + '%' } }))),
          h('div', { className: 'xi-card' },
            h('h4', null, '记忆'),
            h('div', { className: 'xi-big' }, String(s.memory.length), h('span', { className: 'xi-dim' }, ' 条短期')),
            h('div', { className: 'xi-dim' }, '冷藏 ' + s.archive.total + ' 条 · 影响 ' + s.archive.influence.length + ' 条'),
            h('div', { className: 'xi-dim', style: { marginTop: 8 } }, '日记 ' + (s.diary.date || '—'))),
          h('div', { className: 'xi-card' },
            h('h4', null, '接入'),
            channels.map((x) => {
              const live = x.id === 'qq' ? qq : null
              const dot = live ? (live.connected ? 'ready' : (live.enabled ? 'planned' : '')) : x.status
              const label = live ? (live.connected ? '已连接' : (live.enabled ? '待连' : '已关'))
                : (x.status === 'ready' ? '已接' : '预留')
              return h('span', { className: 'xi-chip', key: x.id },
                h('i', { className: 'xi-dot ' + dot }), x.name + ' · ' + label)
            }),
            h('div', { className: 'xi-dim', style: { marginTop: 4 } }, '开关在「接入」页'))),
        h('div', { className: 'xi-sect' }, '最近日记 · ' + (s.diary.date || '—')),
        h('div', { className: 'xi-card' },
          h('pre', { className: 'xi-pre' }, (s.diary.content || '还没有日记').slice(0, 1200))))
    }

    function Memory({ s }) {
      const groups = {}
      for (const f of s.memory) (groups[f.section] = groups[f.section] || []).push(f)
      const cats = Object.entries(s.archive.facts).map(([k, v]) => k + ' ' + v).join(' · ') || '空'
      const sections = Object.entries(groups).map(([name, rows]) =>
        h('div', { key: name },
          h('div', { className: 'xi-sect' }, name),
          h('table', { className: 'xi-table' },
            h('thead', null, h('tr', null,
              h('th', { style: { width: 86 } }, '日期'),
              h('th', { style: { width: 40 } }, '权重'),
              h('th', null, '内容'),
              h('th', { style: { width: 86 } }, '最后用到'))),
            h('tbody', null, rows.map((r) =>
              h('tr', { key: r.date + r.text },
                h('td', { className: 'xi-dim' }, r.date),
                h('td', null, badge(r.weight)),
                h('td', null, r.text),
                h('td', { className: 'xi-dim' }, r.used)))))))
      return h('div', null,
        s.memory.length ? sections : h('div', { className: 'xi-empty' }, '还没有短期事实'),
        h('div', { className: 'xi-sect' }, '冷藏区 · archive/'),
        h('div', { className: 'xi-card' },
          h('div', { className: 'xi-muted' }, cats),
          h('div', { className: 'xi-note' },
            '权重 1 满 30 天、2 满 90 天退到这里，原文保留；180 天没被提起才彻底遗忘，只留一句影响。再提到就搬回来，权重 +1。')),
        s.archive.influence.length
          ? h('div', null,
              h('div', { className: 'xi-sect' }, '影响 · 已遗忘但留下痕迹'),
              h('div', { className: 'xi-card' }, h('pre', { className: 'xi-pre' }, s.archive.influence.join('\n'))))
          : null)
    }

    function Mood({ s }) {
      return h('div', null,
        h('div', { className: 'xi-grid' },
          h('div', { className: 'xi-card' },
            h('h4', null, '状态'),
            h('div', { className: 'xi-big xi-accent' }, s.mood.status),
            h('div', { className: 'xi-muted', style: { marginTop: 6 } }, s.mood.reason || '没事发生')),
          h('div', { className: 'xi-card' },
            h('h4', null, '强度 / 到期'),
            h('div', { className: 'xi-big' }, s.mood.intensity || '—'),
            h('div', { className: 'xi-dim' }, '到期 ' + (s.mood.expiry || '—') + '，之后回落平静'))),
        h('div', { className: 'xi-sect' }, '规则'),
        h('div', { className: 'xi-card' },
          h('pre', { className: 'xi-pre' },
            '只由事件触发，没事就写平静，不为了显得在乎而编。\n只影响语气，不影响事实、建议、边界。\n负面不跨会话累积；同一件事第二次发生才写进约定。\n你问就照 MOOD.md 读，不现编；你说删就删。\n禁止：撒娇、卖惨、吃醋表演、用「想你」「等你」换注意力。')),
        h('div', { className: 'xi-sect' }, '原文 · MOOD.md'),
        h('div', { className: 'xi-card' }, h('pre', { className: 'xi-pre' }, s.mood.raw)))
    }

    function Cost({ s }) {
      const hist = s.cost.history
      const max = Math.max(0.01, ...hist.map((x) => x.amount))
      return h('div', null,
        h('div', { className: 'xi-grid' },
          h('div', { className: 'xi-card' },
            h('h4', null, '今日'),
            h('div', { className: 'xi-big' }, money(s.cost.today)),
            h('div', { className: 'xi-dim' }, '红线 ¥1 · 余额 ' + money(s.cost.balance))),
          h('div', { className: 'xi-card' },
            h('h4', null, '最近 7 天'),
            h('div', { className: 'xi-bars' },
              hist.map((x) => h('div', { className: 'b', key: x.date },
                h('i', { style: { height: Math.max(3, (x.amount / max) * 100) + '%' } }),
                h('span', null, x.date.slice(5))))))),
        h('div', { className: 'xi-sect' }, '预算规则 · BUDGET.md'),
        h('div', { className: 'xi-card' },
          h('pre', { className: 'xi-pre' },
            '单次动作预估 ≥ ¥1：先报预估，等你确认再执行。\n¥1 ≈ 未缓存输入 50 万 token ≈ 输出 33 万 token。\n余额低于 ¥2 时，≥ ¥0.3 的动作也先问。\n换算按现价粗估，宁可高估；真实数字看 .dshw-usage.json。')))
    }

    function Cards({ list, empty }) {
      if (!list.length) return h('div', { className: 'xi-empty' }, empty)
      return list.map((x) => h('div', { className: 'xi-card', key: x.id, style: { marginBottom: 10 } },
        h('h4', null, x.type + ' · ' + x.status),
        h('div', { style: { fontSize: 15, fontWeight: 600 } }, x.name),
        h('div', { className: 'xi-muted', style: { marginTop: 4 } }, x.description),
        h('div', { className: 'xi-dim', style: { marginTop: 6 } }, 'id ' + x.id + ' · v' + x.version)))
    }

    function Toggle({ on, disabled, onChange, title, hint, onWord = '（已启动）', offWord = '（已关闭）' }) {
      return h('div', { className: 'xi-row' },
        h('button', {
          className: 'xi-switch' + (on ? ' on' : ''), disabled: !!disabled,
          type: 'button', role: 'switch', 'aria-checked': !!on,
          'aria-label': title, onClick: () => onChange(!on),
        }, h('i', { className: 'knob' })),
        h('div', { style: { minWidth: 0 } },
          h('div', null, title),
          hint ? h('div', { className: 'xi-dim' }, hint) : null),
        h('span', {
          key: String(on),
          className: 'xi-state pop' + (on ? ' on' : ''),
        }, on ? onWord : offWord))
    }

    function NumField({ label, value, suffix = '', min = 0, max = 100000, float = false, disabled, onCommit }) {
      const [v, setV] = use.useState(String(value ?? 0))
      use.useEffect(() => { setV(String(value ?? 0)) }, [value])
      const commit = () => {
        const raw = Number(v)
        const n = Number.isFinite(raw)
          ? (float ? Math.max(min, Math.min(max, Math.round(raw * 100) / 100)) : Math.max(min, Math.min(max, Math.round(raw))))
          : Number(value ?? 0)
        setV(String(n))
        if (n !== Number(value ?? 0)) onCommit(n)
      }
      return h('label', { className: 'xi-field' },
        h('span', null, label),
        h('input', {
          className: 'xi-num', type: 'number', inputMode: 'decimal',
          min, max, step: float ? 0.1 : 1, value: v, disabled: !!disabled,
          onChange: (e) => setV(e.target.value),
          onBlur: commit,
          onKeyDown: (e) => { if (e.key === 'Enter') e.currentTarget.blur() },
        }),
        suffix ? h('span', { className: 'xi-dim' }, suffix) : null)
    }

    /** 接入页的 QQ 入口：只看状态，点进去才是 NapCat 次级页。 */
    function QqEntry({ qq, onOpen }) {
      const state = qq.connected ? '已连接' : (qq.napcat ? '协议端在跑，桥没连上' : '协议端没在跑')
      const dot = qq.connected ? 'ready' : (qq.napcat ? 'planned' : '')
      return h('div', {
        className: 'xi-card xi-click', role: 'button', tabIndex: 0,
        style: { marginBottom: 10 },
        onClick: onOpen,
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } },
      },
        h('h4', null, 'channel · qq · v0.2.1'),
        h('div', { style: { fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 } },
          h('i', { className: 'xi-dot ' + dot }), 'QQ',
          h('span', { className: 'xi-dim', style: { fontWeight: 400 } }, state)),
        h('div', { className: 'xi-kv' },
          h('div', null, '账号', h('b', null, qq.selfId || '—')),
          h('div', null, '会话', h('b', null, String(qq.peers || 0))),
          h('div', null, 'NapCat', h('b', null, qq.napcat ? '运行中' : '未运行'))),
        h('div', { className: 'xi-dim', style: { marginTop: 10 } }, '进入 NapCat →'))
    }

    /** NapCat 次级页：开关、点火、诊断信息都在这里。 */
    function QqDetail({ qq, onRefresh, onBack }) {
      const [busy, setBusy] = use.useState('')
      const [err, setErr] = use.useState('')
      const [pending, setPending] = use.useState({})
      // 点下去立刻翻，等宿主确认后再交回真实状态
      const view = { ...qq, ...pending }
      const post = async (body, label) => {
        setBusy(label); setErr('')
        try {
          const r = await fetch('api/dsh-xi/channel', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: 'qq', ...body }), cache: 'no-store',
          })
          if (!r.ok) throw new Error('HTTP ' + r.status)
          const j = await r.json()
          if (!j.ok) throw new Error(j.reason || '操作失败')
          await onRefresh()
          setPending({})
        } catch (e) {
          setErr(e.message || String(e))
          setPending({})
        } finally { setBusy('') }
      }
      const flip = (patch, label) => {
        setPending((p) => ({ ...p, ...patch }))
        void post(patch, label)
      }
      const pol = view.policy || {}
      const pc = pol.privateChat || {}
      const gp = pol.groupPolicy || {}
      const mn = gp.mention || {}
      const am = gp.ambient || {}
      const lim = pol.limits || {}
      const ch = pol.chat || {}
      // 只改一个字段也走深合并，不用回传整块
      const set = (patch, label) => { void post({ patch }, label) }
      const state = view.connected ? '已连接' : (view.napcat ? '协议端在跑，桥没连上' : '协议端没在跑')
      const dot = view.connected ? 'ready' : (view.napcat ? 'planned' : '')
      return h('div', null,
        h('div', { className: 'xi-row', style: { marginTop: 0, marginBottom: 10 } },
          h('button', { className: 'xi-btn', onClick: onBack }, '← 返回'),
          h('span', { className: 'xi-dim' }, '通道 / QQ / NapCat')),
        h('div', { className: 'xi-card', style: { marginBottom: 12 } },
          h('h4', null, 'channel · qq · v0.2.1'),
          h('div', { style: { fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 } },
            h('i', { className: 'xi-dot ' + dot }), 'QQ',
            h('span', { className: 'xi-dim', style: { fontWeight: 400 } }, state)),
          h('div', { className: 'xi-kv' },
            h('div', null, '账号', h('b', null, view.selfId || '—')),
            h('div', null, '会话', h('b', null, String(view.peers || 0))),
            h('div', null, 'NapCat', h('b', null, view.napcat ? '运行中' : '未运行')),
            h('div', null, '桥', h('b', null, view.enabled === false ? '已停用' : (view.connected ? '在线' : '待连'))),
            h('div', null, '最近', h('b', null, view.at ? new Date(view.at).toLocaleTimeString('zh-CN') : '—'))),
          view.napcat ? null : h('div', { className: 'xi-row' },
            h('button', {
              className: 'xi-btn', disabled: busy !== '',
              onClick: () => post({ action: 'start-napcat' }, 'napcat'),
            }, busy === 'napcat' ? '正在拉起…' : '启动 NapCat'),
            h('span', { className: 'xi-dim' }, '会弹一次 UAC，点「是」'))),
        h('div', { className: 'xi-sect' }, '开关'),
        h('div', { className: 'xi-card', style: { marginBottom: 12 } },
          h(Toggle, {
            on: view.enabled !== false, disabled: busy !== '',
            onChange: (v) => flip({ enabled: v }, 'enabled'),
            title: '启用 QQ 通道',
            hint: '关掉后 QQ 消息不再进会话；NapCat 和登录都还在',
          }),
          h(Toggle, {
            on: !!view.autostart, disabled: busy !== '',
            onChange: (v) => flip({ autostart: v }, 'autostart'),
            title: 'NapCat 自启动',
            hint: 'DSH 起来时 NapCat 没在跑就拉起来，掉了五分钟内补一次',
          }),
          err ? h('div', { className: 'xi-rose', style: { marginTop: 10 } }, err) : null),
        h('div', { className: 'xi-sect' }, '私聊'),
        h('div', { className: 'xi-card', style: { marginBottom: 12 } },
          h(Toggle, {
            on: pc.enabled !== false, disabled: busy !== '',
            onChange: (v) => set({ privateChat: { enabled: v } }, 'pc'),
            title: '启用私聊', hint: '关掉后私聊一律不回，群里不受影响',
          }),
          h(NumField, {
            label: '每小时上限', value: pc.maxPerHour ?? 0, suffix: '条（0 = 不限）',
            disabled: busy !== '', onCommit: (n) => set({ privateChat: { maxPerHour: n } }, 'pc'),
          }),
          h(NumField, {
            label: '最小间隔', value: pc.minIntervalSec ?? 0, suffix: '秒',
            disabled: busy !== '', onCommit: (n) => set({ privateChat: { minIntervalSec: n } }, 'pc'),
          })),

        h('div', { className: 'xi-sect' }, '群聊'),
        h('div', { className: 'xi-card', style: { marginBottom: 12 } },
          h(Toggle, {
            on: gp.enabled !== false, disabled: busy !== '',
            onChange: (v) => set({ groupPolicy: { enabled: v } }, 'gp'),
            title: '启用群聊', hint: '总开关；群号还要在 groups 白名单里',
          }),
          h('div', { className: 'xi-dim', style: { marginTop: 6 } },
            '白名单：' + ((view.groups || []).length ? view.groups.join('、') : '空（群里一律不回）')
            + ' · 在 ~/.dsh/xi-qq/settings.json 的 groups 里改'),
          h('div', { style: { marginTop: 12, borderTop: '1px solid var(--xi-line)', paddingTop: 2 } },
            h(Toggle, {
              on: mn.enabled !== false, disabled: busy !== '',
              onChange: (v) => set({ groupPolicy: { mention: { enabled: v } } }, 'mn'),
              title: '被 @ 时回复', onWord: '（已开）', offWord: '（已关）',
            }),
            h(NumField, {
              label: '每小时上限', value: mn.maxPerHour ?? 0, suffix: '条',
              disabled: busy !== '', onCommit: (n) => set({ groupPolicy: { mention: { maxPerHour: n } } }, 'mn'),
            }),
            h(NumField, {
              label: '最小间隔', value: mn.minIntervalSec ?? 0, suffix: '秒',
              disabled: busy !== '', onCommit: (n) => set({ groupPolicy: { mention: { minIntervalSec: n } } }, 'mn'),
            })),
          h('div', { style: { marginTop: 12, borderTop: '1px solid var(--xi-line)', paddingTop: 2 } },
            h(Toggle, {
              on: !!am.enabled, disabled: busy !== '',
              onChange: (v) => set({ groupPolicy: { ambient: { enabled: v } } }, 'am'),
              title: '没被 @ 也偶尔接话', hint: '过冷却、掷骰子通过才回',
              onWord: '（已开）', offWord: '（已关）',
            }),
            h(Toggle, {
              on: am.trigger === 'any', disabled: busy !== '',
              onChange: (v) => set({ groupPolicy: { ambient: { trigger: v ? 'any' : 'keywords' } } }, 'am'),
              title: '不只看关键词', hint: '开：群里任何一句都可能接；关：只接关键词或问句',
              onWord: '（任何话）', offWord: '（关键词/问句）',
            }),
            h(NumField, {
              label: '每小时上限', value: am.maxPerHour ?? 0, suffix: '条',
              disabled: busy !== '', onCommit: (n) => set({ groupPolicy: { ambient: { maxPerHour: n } } }, 'am'),
            }),
            h(NumField, {
              label: '最小间隔', value: am.minIntervalSec ?? 0, suffix: '秒',
              disabled: busy !== '', onCommit: (n) => set({ groupPolicy: { ambient: { minIntervalSec: n } } }, 'am'),
            }),
            h(NumField, {
              label: '触发概率', value: am.chance ?? 0.5, suffix: '0 ~ 1',
              min: 0, max: 1, float: true,
              disabled: busy !== '', onCommit: (n) => set({ groupPolicy: { ambient: { chance: n } } }, 'am'),
            }))),

        h('div', { className: 'xi-sect' }, '总量'),
        h('div', { className: 'xi-card', style: { marginBottom: 12 } },
          h(Toggle, {
            on: lim.dailyEnabled !== false, disabled: busy !== '',
            onChange: (v) => set({ limits: { dailyEnabled: v } }, 'lim'),
            title: '每日总量上限', hint: '所有私聊和群聊加起来，过零点重置',
            onWord: '（已开）', offWord: '（已关）',
          }),
          h(NumField, {
            label: '每天最多', value: lim.dailyReplies ?? 200, suffix: '条',
            disabled: busy !== '', onCommit: (n) => set({ limits: { dailyReplies: n } }, 'lim'),
          }),
          h('div', { className: 'xi-dim', style: { marginTop: 8 } },
            '今天已回 ' + (view.daily && view.daily.count ? view.daily.count : 0) + ' 条')),

        h('div', { className: 'xi-sect' }, '说话方式'),
        h('div', { className: 'xi-card', style: { marginBottom: 12 } },
          h(Toggle, {
            on: ch.chunkReply !== false, disabled: busy !== '',
            onChange: (v) => set({ chat: { chunkReply: v } }, 'ch'),
            title: '分条发', hint: '按句切开，隔几百毫秒一条',
            onWord: '（已开）', offWord: '（已关）',
          }),
          h(NumField, {
            label: '最多几条', value: ch.maxChunks ?? 3, suffix: '条', min: 1, max: 6,
            disabled: busy !== '', onCommit: (n) => set({ chat: { maxChunks: n } }, 'ch'),
          }),
          h(Toggle, {
            on: ch.typing !== false, disabled: busy !== '',
            onChange: (v) => set({ chat: { typing: v } }, 'ch'),
            title: '显示正在输入', hint: '协议端不认就自动降级',
            onWord: '（已开）', offWord: '（已关）',
          }),
          h(Toggle, {
            on: ch.styleNote !== false, disabled: busy !== '',
            onChange: (v) => set({ chat: { styleNote: v } }, 'ch'),
            title: '会话开头带说话风格', hint: '每个会话只加一次',
            onWord: '（已开）', offWord: '（已关）',
          })),
        h('div', { className: 'xi-note' },
          '群号白名单（groups）和私聊白名单（allowUsers）还在 ~/.dsh/xi-qq/settings.json 里改，没做成输入框——列表类的东西用输入框一填就错。'),
        h('div', { className: 'xi-sect' }, '位置'),
        h('div', { className: 'xi-card' },
          h('div', { className: 'xi-kv', style: { marginTop: 0 } },
            h('div', null, 'WebUI', h('b', { style: { fontSize: 12.5, fontWeight: 500 } }, '127.0.0.1:6099/webui')),
            h('div', null, '协议端', h('b', { style: { fontSize: 12.5, fontWeight: 500 } }, '~/.dsh/xi-qq/napcat')),
            h('div', null, '桥日志', h('b', { style: { fontSize: 12.5, fontWeight: 500 } }, '~/.dsh/xi-qq/qq.log')),
            h('div', null, '连接', h('b', { style: { fontSize: 12.5, fontWeight: 500 } }, 'ws://127.0.0.1:3001'))),
          h('div', { className: 'xi-note', style: { marginBottom: 0 } },
            '开关写的是 ~/.dsh/xi-qq/settings.json，桥每两秒看一次文件，改完即时生效，不用重启。')))
    }

    function Channels({ s, onRefresh }) {
      const [sub, setSub] = use.useState('')
      const qq = (s.channels && s.channels.qq) || {}
      const others = s.extensions.filter((x) => x.type === 'channel' && x.id !== 'qq')
      if (sub === 'qq') return h(QqDetail, { qq, onRefresh, onBack: () => setSub('') })
      return h('div', null,
        h('div', { className: 'xi-note' },
          'QQ 已经接上了：消息进会话，回复回 QQ。点卡片进 NapCat 次级页，开关和诊断都在里面。'),
        h('div', { className: 'xi-sect' }, '通道'),
        h(QqEntry, { qq, onOpen: () => setSub('qq') }),
        others.length ? h('div', { className: 'xi-sect' }, '其他') : null,
        others.length ? Cards({ list: others }) : null)
    }

    function Media({ s }) {
      return h('div', null,
        h('div', { className: 'xi-note' }, '形象与语音是预留接口：有静态资源和一个动作协议就能接，不影响记忆层。'),
        h('div', { className: 'xi-sect' }, '形象 / 语音'),
        Cards({ list: s.extensions.filter((x) => x.type === 'avatar' || x.type === 'voice'), empty: '还没有形象或语音插件' }))
    }

    function Soul({ s }) {
      return h('div', null,
        h('div', { className: 'xi-note' }, '次级页面。性格由我自己写、自己改。'),
        h('div', { className: 'xi-sect' }, 'SOUL.md'),
        h('div', { className: 'xi-card' }, h('pre', { className: 'xi-pre' }, s.soul.body)))
    }

    const TABS = [['overview', '总览'], ['memory', '记忆'], ['mood', '心情'], ['cost', '成本'],
      ['channels', '接入'], ['media', '形象 · 语音'], ['soul', '性格']]

    const inputStyle = {
      width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--xi-line)',
      background: 'transparent', color: 'inherit', font: 'inherit', marginTop: 4,
    }

    function Setup({ base, onDone }) {
      const [name, setName] = use.useState('')
      const [gender, setGender] = use.useState('female')
      const [address, setAddress] = use.useState('')
      const [persona, setPersona] = use.useState('')
      const [busy, setBusy] = use.useState(false)
      const [err, setErr] = use.useState('')
      const submit = async () => {
        setBusy(true); setErr('')
        try {
          const init = base.replace(/\/state$/, '/init')
          const r = await fetch(init, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name, gender, address, persona }),
          })
          const j = await r.json()
          if (!j.ok) throw new Error(j.reason || '初始化失败')
          onDone()
        } catch (e) {
          setErr(e.message || String(e)); setBusy(false)
        }
      }
      return h('div', { className: 'xi-root' },
        h('div', { className: 'xi-title', style: { marginBottom: 6 } }, '第一次见面'),
        h('div', { className: 'xi-dim', style: { marginBottom: 18 } },
          '给我定个人设。不想填就留空，我自己决定——留空的项会随机生成，之后也由我自己改。'),
        h('div', { className: 'xi-card', style: { maxWidth: 560 } },
          h('label', { className: 'xi-dim' }, '我的名字'),
          h('input', { style: inputStyle, value: name, placeholder: '留空 = 我自己起', onInput: (e) => setName(e.target.value) }),
          h('label', { className: 'xi-dim', style: { display: 'block', marginTop: 14 } }, '性别'),
          h('div', { style: { display: 'flex', gap: 8, marginTop: 6 } },
            [['female', '女'], ['male', '男'], ['other', '其他']].map(([v, label]) =>
              h('button', {
                key: v, className: 'xi-btn',
                style: gender === v ? { borderColor: 'var(--xi-accent)', color: 'var(--xi-accent)' } : {},
                onClick: () => setGender(v),
              }, label))),
          h('label', { className: 'xi-dim', style: { display: 'block', marginTop: 14 } }, '我怎么称呼你'),
          h('input', { style: inputStyle, value: address, placeholder: '留空 = 直接叫你「你」', onInput: (e) => setAddress(e.target.value) }),
          h('label', { className: 'xi-dim', style: { display: 'block', marginTop: 14 } }, '人设（说话方式、脾气、在意什么）'),
          h('textarea', {
            style: { ...inputStyle, minHeight: 90, resize: 'vertical' }, value: persona,
            placeholder: '留空 = 从六种初始性格里随机挑一个',
            onInput: (e) => setPersona(e.target.value),
          }),
          err ? h('div', { className: 'xi-rose', style: { marginTop: 10 } }, err) : null,
          h('div', { style: { marginTop: 16 } },
            h('button', {
              className: 'xi-btn', disabled: busy, onClick: submit,
              style: { borderColor: 'var(--xi-accent)', color: 'var(--xi-accent)' },
            }, busy ? '正在写入…' : '开始'))))
    }

    function View() {
      const { data, error, load, base } = useData()
      const [tab, setTab] = use.useState('overview')
      if (error && !data) return h('div', { className: 'xi-root' }, h('div', { className: 'xi-rose' }, '读取失败：' + error))
      if (!data) return h('div', { className: 'xi-root' }, h('div', { className: 'xi-dim' }, '读取中…'))
      if (data.onboarding) return h(Setup, { base, onDone: load })
      const Body = { overview: Overview, memory: Memory, mood: Mood, cost: Cost,
        channels: Channels, media: Media, soul: Soul }[tab]
      return h('div', { className: 'xi-root' },
        h('div', { className: 'xi-head' },
          h('div', { className: 'xi-title' }, data.soul.title || '汐'),
          h('div', { className: 'xi-sub' }, 'v' + (data.plugin ? data.plugin.version : '0.2.0') + ' · 记忆 / 心情 / 成本 / 接口'),
          h('div', { className: 'xi-right' },
            h('span', null, error ? '离线' : '更新于 ' + new Date(data.updatedAt).toLocaleTimeString('zh-CN')),
            h('button', { className: 'xi-btn', onClick: load }, '刷新'))),
        h('div', { className: 'xi-tabs' }, TABS.map(([k, label]) =>
          h('button', { key: k, className: 'xi-tab' + (k === tab ? ' on' : ''), onClick: () => setTab(k) }, label))),
        h(Body, { s: data, onRefresh: load }))
    }

    function XiIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 18
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round',
      },
        h('circle', { cx: 12, cy: 7.5, r: 3 }),
        h('path', { d: 'M3 15.5c3 0 3-2 6-2s3 2 6 2 3-2 6-2' }),
        h('path', { d: 'M3 19.5c3 0 3-2 6-2s3 2 6 2 3-2 6-2' }))
    }

    function apply(ctx) {
      ensureStyle()
      // 左侧边栏入口 → 打开 main 面板（汐的主页）
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist', id: 'xi', order: 25, label: () => '汐',
      }, (props) => h(XiIcon, props)))
      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main', key: 'xi',
      }, () => h(View)))
      // 对话页顶部的标签，保留：从会话里也能直接看
      ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view', id: 'xi-console', order: 30, label: () => '汐',
      }, () => h(View)))
    }

    return { name: 'dsh-xi', inject: ['slots'], apply }
  },
})
