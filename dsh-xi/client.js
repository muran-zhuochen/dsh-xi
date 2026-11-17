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
.xi-primary{border-color:color-mix(in srgb,var(--xi-accent) 55%,transparent);color:var(--xi-accent);font-weight:600}
.xi-primary:hover{border-color:var(--xi-accent);background:color-mix(in srgb,var(--xi-accent) 8%,transparent)}
.xi-token{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:10px;
  border-top:1px solid var(--xi-line)}
.xi-code{font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;font-size:12.5px;
  letter-spacing:.4px;padding:2px 8px;border-radius:6px;border:1px solid var(--xi-line);
  background:color-mix(in srgb,currentColor 6%,transparent);cursor:text;user-select:all}
.xi-copied{color:var(--xi-accent);border-color:color-mix(in srgb,var(--xi-accent) 55%,transparent)}
/* 白名单：一个号一个胶囊，× 移出；下面一行输入框加号 */
.xi-wl-head{display:flex;align-items:baseline;gap:8px;margin-bottom:8px;font-size:12.5px}
.xi-wl-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.xi-wl-chip{display:inline-flex;align-items:center;border:1px solid var(--xi-line);border-radius:99px;
  padding:1px 2px 1px 10px;font-size:12px;font-variant-numeric:tabular-nums;color:var(--xi-muted)}
.xi-wl-x{border:0;background:none;color:var(--xi-dim);cursor:pointer;font:inherit;font-size:14px;
  line-height:1;padding:3px 7px;border-radius:99px}
.xi-wl-x:hover{color:var(--xi-rose);background:color-mix(in srgb,var(--xi-rose) 10%,transparent)}
.xi-wl-add{display:flex;gap:8px}
.xi-wl-input{flex:1 1 auto;min-width:0;padding:6px 10px;border:1px solid var(--xi-line);border-radius:8px;
  background:transparent;color:inherit;font:inherit;font-size:12.5px}
.xi-wl-input:focus{outline:none;border-color:var(--xi-accent)}
.xi-wl-rej{margin-top:10px;line-height:2}
.xi-wl-rejbtn{border:1px dashed color-mix(in srgb,currentColor 22%,transparent);background:transparent;
  color:var(--xi-muted);border-radius:99px;padding:1px 9px;margin:0 6px 4px 0;cursor:pointer;
  font:inherit;font-size:11.5px;font-variant-numeric:tabular-nums}
.xi-wl-rejbtn:hover{color:var(--xi-accent);border-color:color-mix(in srgb,var(--xi-accent) 55%,transparent)}
.xi-wl-sep{margin:14px 0;border-top:1px solid var(--xi-line)}
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

    // NapCat 端已于 2026-10-28 拆除，WebUI/密码/面板相关常量一并移除。

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
            h('div', { className: 'xi-big' }, String(s.memory.length), h('span', { className: 'xi-dim' }, ' 条常驻')),
            h('div', { className: 'xi-dim' }, '永久 ' + (s.archive.permanent || 0) + ' · 珍贵 ' + (s.archive.precious || 0) + ' · 遗忘 ' + s.archive.total),
            h('div', { className: 'xi-dim', style: { marginTop: 8 } }, '日记 ' + (s.diary.date || '—'))),
          h('div', { className: 'xi-card' },
            h('h4', null, '接入'),
            channels.length
              ? channels.map((x) => h('span', { className: 'xi-chip', key: x.id },
                  h('i', { className: 'xi-dot ' + (x.status === 'ready' ? 'ready' : '') }), x.name))
              : h('div', { className: 'xi-dim' }, '无外部通道'),
            h('div', { className: 'xi-dim', style: { marginTop: 4 } }, 'QQ 通道已移除'))),
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
        h('div', { className: 'xi-sect' }, '其他区 · 永久 / 珍贵 / 遗忘'),
        h('div', { className: 'xi-card' },
          h('div', { className: 'xi-muted' }, '永久 ' + (s.archive.permanent || 0) + ' 条 · 珍贵 ' + (s.archive.precious || 0) + ' 篇 · 遗忘 ' + cats),
          h('div', { className: 'xi-note' },
            '短期满 30 天整文件搬进遗忘；常驻退下来进永久或遗忘。彻底忘掉按权重（永/半/淡）：关系与经历默认半，工作默认淡。再提到先回短期、标模糊，权重 +1。')),
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

    const copyText = async (text) => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
          return
        }
      } catch (e) { /* 权限不给就退到 execCommand */ }
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      let ok = false
      try { ok = document.execCommand('copy') } catch (e) { ok = false }
      ta.remove()
      if (!ok) throw new Error('clipboard unavailable')
    }

    function Channels({ s }) {
      const [acc, setAcc] = use.useState(null)
      use.useEffect(() => {
        let alive = true
        const load = () => {
          fetch('/api/dsh-xi/access')
            .then((r) => r.json())
            .then((v) => { if (alive) setAcc(v) })
            .catch(() => {})
        }
        load()
        const timer = setInterval(load, 5000)
        return () => { alive = false; clearInterval(timer) }
      }, [])

      const qq = acc && acc.openqq
      const live = Boolean(qq && qq.webui)
      const dot = (ok) => h('span', { style: { color: ok ? '#3fb950' : '#d29922', fontWeight: 700 } }, ok ? '● 在线' : '○ 离线')
      const src = qq && qq.token ? acc.prefix + '#token=' + qq.token : (acc ? acc.prefix : '')

      return h('div', null,
        h('div', { className: 'xi-card' },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            h('div', null,
              h('div', { style: { fontSize: 16, fontWeight: 650 } }, 'Vesper QQ'),
              h('div', { className: 'xi-dim', style: { marginTop: 4 } },
                'OpenQQ（本机 OneBot v11）→ 只认主人一个号的私信')),
            h('div', null, dot(live))),
          h('div', { className: 'xi-dim', style: { marginTop: 10, lineHeight: 1.9 } },
            '控制台：' + (live ? '在线' : '离线') + ' · 协议端 3001：' + (qq && qq.onebot ? '在听' : '没开') +
            ' · 密钥：' + (qq && qq.token ? '已抓到' : '还没有') +
            (qq && qq.pid ? ' · pid ' + qq.pid : '')),
          h('div', { className: 'xi-dim', style: { marginTop: 6 } },
            '离线就去 E:\\Ai-Agent\\快捷方式\\ 双击「启动QQ」；它起来会自动抓密钥，这一页 5 秒刷新一次。')),

        live && src
          ? h('iframe', {
              key: src,
              src,
              title: 'OpenQQ 控制台',
              style: { width: '100%', height: 'calc(100vh - 300px)', minHeight: 420, border: '1px solid var(--xi-line)', borderRadius: 12, marginTop: 14, background: '#fff' },
            })
          : h('div', { className: 'xi-empty', style: { marginTop: 14 } },
              '控制台没开，嵌不了。先启动 QQ 通道。'))
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

    function Archive() {
      const [ov, setOv] = use.useState(null)
      const [err, setErr] = use.useState('')
      const [form, setForm] = use.useState({ q: '', kind: '', from: '', to: '', order: 'newest' })
      const [result, setResult] = use.useState(null)
      const [busy, setBusy] = use.useState(false)
      const [open, setOpen] = use.useState(null)
      const [day, setDay] = use.useState('')
      const [lines, setLines] = use.useState(null)
      const post = (p) => fetch(p, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      use.useEffect(() => {
        let alive = true
        post('/api/dsh-xi-memory/overview')
          .then((j) => { if (alive) setOv(j) })
          .catch((e) => { if (alive) setErr(e.message || String(e)) })
        return () => { alive = false }
      }, [])
      const change = (patch) => setForm(Object.assign({}, form, patch))
      const run = (cursor) => {
        const q = form.q.trim()
        if (q === '') return
        setBusy(true)
        setErr('')
        const qs = new URLSearchParams({ q, limit: '20', order: form.order })
        if (form.kind) qs.set('kind', form.kind)
        if (form.from) qs.set('from', form.from)
        if (form.to) qs.set('to', form.to)
        if (cursor) qs.set('cursor', String(cursor))
        post('/api/dsh-xi-memory/search?' + qs)
          .then((j) => setResult(cursor
            ? Object.assign({}, j, { items: (result ? result.items : []).concat(j.items) })
            : j))
          .catch((e) => setErr(e.message || String(e)))
          .finally(() => setBusy(false))
      }
      const show = (item, offset) => {
        const base = open && open.ref === item.ref ? open.text : ''
        setOpen({ ref: item.ref, text: base, loading: true })
        post('/api/dsh-xi-memory/read?ref=' + encodeURIComponent(item.ref) + '&offset=' + (offset || 0) + '&limit=2000')
          .then((j) => setOpen({ ref: item.ref, text: base + j.text, nextOffset: j.nextOffset, total: j.total, loading: false }))
          .catch((e) => setOpen({ ref: item.ref, text: base, error: e.message || String(e), loading: false }))
      }
      const openDay = (d) => {
        if (day === d) { setDay(''); setLines(null); return }
        setDay(d); setLines(null)
        post('/api/dsh-xi-memory/day?day=' + encodeURIComponent(d))
          .then((j) => setLines(j.lines || []))
          .catch(() => setLines([]))
      }
      const field = {
        padding: '6px 9px', borderRadius: 8, border: '1px solid var(--xi-line)',
        background: 'transparent', color: 'inherit', font: 'inherit', fontSize: 12.5,
      }
      const kinds = [['', '全部'], ['conversation', '对话'], ['diary', '日记'], ['permanent', '永久'], ['precious', '珍贵'], ['forgotten', '遗忘']]
      const total = ov ? ov.days.reduce((n, d) => n + d.entries, 0) : 0
      const last = ov && ov.days.length > 0 ? Math.max.apply(null, ov.days.map((d) => d.mtime)) : 0
      return h('div', null,
        h('div', { className: 'xi-row' },
          h('span', { className: 'xi-muted' }, (ov ? ov.days.length : 0) + ' 天 · ' + total + ' 条 · ' +
            (ov ? ov.sessions : 0) + ' 个会话'),
          h('span', { className: 'xi-state' }, '最后写入 ' +
            (last ? new Date(last).toLocaleString('zh-CN', { hour12: false }) : '—'))),
        h('div', { className: 'xi-setting', style: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 10 } },
          h('select', { style: field, value: form.kind, onChange: (e) => change({ kind: e.target.value }) },
            kinds.map((k) => h('option', { key: k[0], value: k[0] }, k[1]))),
          h('label', { className: 'xi-dim' }, '从 ', h('input', {
            type: 'date', style: field, value: form.from, onChange: (e) => change({ from: e.target.value }),
          })),
          h('label', { className: 'xi-dim' }, '到 ', h('input', {
            type: 'date', style: field, value: form.to, onChange: (e) => change({ to: e.target.value }),
          })),
          h('select', { style: field, value: form.order, onChange: (e) => change({ order: e.target.value }) },
            h('option', { value: 'newest' }, '新的在前'),
            h('option', { value: 'oldest' }, '旧的在前'))),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 10 } },
          h('input', {
            style: Object.assign({ flex: 1 }, field), value: form.q,
            placeholder: '原话里的一小段，比如「火锅」',
            onChange: (e) => change({ q: e.target.value }),
            onKeyDown: (e) => { if (e.key === 'Enter') run(0) },
          }),
          h('button', { className: 'xi-btn', onClick: () => run(0), disabled: busy }, busy ? '搜…' : '找')),
        err ? h('div', { className: 'xi-rose', style: { marginTop: 8 } }, err) : null,
        result === null ? null : h('div', null,
          h('div', { className: 'xi-dim', style: { marginTop: 10 } },
            result.items.length === 0 ? '没有找到。换个词，或者直接翻下面的日子。' : '找到 ' + result.items.length + ' 条' + (result.total ? '（共 ' + result.total + ' 条）' : '')),
          h('div', { className: 'xi-card', style: { marginTop: 8 } },
            result.items.map((item, i) => h('div', {
              key: item.ref,
              style: { padding: '10px 0', borderBottom: i + 1 < result.items.length ? '1px solid var(--xi-line)' : 'none' },
            },
              h('div', { className: 'xi-dim', style: { fontSize: 11.5 } },
                [item.who, item.time, item.ref].filter(Boolean).join(' · ')),
              h('div', { className: 'xi-muted', style: { fontSize: 12.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, item.text),
              h('div', { style: { marginTop: 6, display: 'flex', gap: 8 } },
                h('button', { className: 'xi-btn', onClick: () => show(item, 0) }, '读原文')),
              open && open.ref === item.ref ? h('div', null,
                open.loading ? h('div', { className: 'xi-dim' }, '读取中…') : null,
                open.error ? h('div', { className: 'xi-rose' }, open.error) : null,
                open.text ? h('pre', { className: 'xi-pre', style: { maxHeight: 320, overflow: 'auto', marginTop: 6 } }, open.text) : null,
                open.nextOffset ? h('button', {
                  className: 'xi-btn', style: { marginTop: 6 },
                  onClick: () => show(item, open.nextOffset),
                }, '继续读（共 ' + open.total + ' 字）') : null) : null))),
          result.nextCursor ? h('button', {
            className: 'xi-btn', style: { marginTop: 8 }, disabled: busy,
            onClick: () => run(result.nextCursor),
          }, '更多') : null),
        h('div', { className: 'xi-sect' }, '按天归档'),
        ov && ov.days.length > 0
          ? h('div', { className: 'xi-card' }, ov.days.map((d) => h('div', { key: d.day },
            h('div', {
              className: 'xi-click',
              style: { display: 'flex', gap: 10, padding: '7px 4px', borderBottom: '1px solid var(--xi-line)' },
              onClick: () => openDay(d.day),
            },
              h('span', { className: 'xi-muted', style: { fontVariantNumeric: 'tabular-nums' } }, d.day),
              h('span', { className: 'xi-state' }, d.entries + ' 条 · ' + Math.round(d.bytes / 1024) + ' KB' +
                (day === d.day ? ' · 收起' : ''))),
            day === d.day ? h('div', { className: 'xi-pre', style: { maxHeight: 320, overflow: 'auto', padding: '6px 4px' } },
              (lines || []).map((l, i) => h('div', { key: i, style: { padding: '3px 0 3px 12px' } },
                l.time ? h('span', { className: 'xi-dim', style: { marginRight: 6 } }, l.time) : null,
                l.who ? h('b', null, l.who + '：') : null,
                l.text))) : null)))
          : h('div', { className: 'xi-dim' }, '还没有归档。'),
        h('div', { className: 'xi-note' }, '归档在 ' + (ov ? ov.archiveDir : '') + '；这一页只读，改记忆改文件。'))
    }

    const TABS = [['overview', '总览'], ['memory', '记忆'], ['archive', '归档'], ['mood', '心情'], ['cost', '成本'],
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
      const Body = { overview: Overview, memory: Memory, archive: Archive, mood: Mood, cost: Cost,
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
      // NapCat 已下线（2026-10-28）：边栏只留「汐」。
      // 左侧边栏入口 → 打开 main 面板（汐的主页）
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist', id: 'xi', order: 25, label: () => '汐',
      }, (props) => h(XiIcon, props)))
      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main', key: 'xi',
      }, () => h(View)))
      // 不再注册 conversation.view：会话页的「汐」标签和左侧边栏重复，入口只留边栏。
    }

    return { name: 'dsh-xi', inject: ['slots', 'layout'], apply }
  },
})
