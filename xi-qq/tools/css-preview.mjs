// 把 client.js 里的 CSS 原样抽出来，渲染成一张对照图，方便没有浏览器控制时自查样式。
// 只用于核对样式表本身，不代表真实面板。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = fs.readFileSync('C:/Users/MRZC/.dsh/plugins/dsh-xi/client.js', 'utf8')
const m = src.match(/const CSS = `([\s\S]*?)`\n/)
if (!m) { console.error('CSS block not found'); process.exit(1) }
const css = m[1]

const html = `<!doctype html><meta charset="utf-8">
<style>
body{margin:0;padding:18px;background:#f6f7f9;font:13.5px/1.6 system-ui,"Microsoft YaHei",sans-serif;color:#1a1a1a}
${css}
</style>
<div class="xi-card" style="max-width:430px">
  <h4>channel · qq</h4>
  <div class="xi-row">
    <button class="xi-switch" role="switch" aria-checked="false"><i class="knob"></i></button>
    <div><div>启用 QQ 通道</div><div class="xi-dim">关掉后 QQ 消息不再进会话</div></div>
    <span class="xi-state">（已关闭）</span>
  </div>
  <div class="xi-row">
    <button class="xi-switch on" role="switch" aria-checked="true"><i class="knob"></i></button>
    <div><div>NapCat 自启动</div><div class="xi-dim">DSH 起来时 NapCat 没在跑就拉起来</div></div>
    <span class="xi-state on">（已启动）</span>
  </div>
  <div class="xi-row">
    <button class="xi-switch" disabled role="switch"><i class="knob"></i></button>
    <div><div>忙碌态</div></div>
    <span class="xi-state">（已关闭）</span>
  </div>
</div>
`

fs.writeFileSync(path.join(here, '.preview.html'), html)
console.log('written', path.join(here, '.preview.html'), 'css bytes', css.length)
