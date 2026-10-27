import { pathToFileURL } from 'node:url'
const q = await import(pathToFileURL('C:/Users/MRZC/.dsh/plugins/dsh-xi/lib/qqlink.js').href)

console.log('before:', await q.qqSnapshot())
const after = q.patchQqSettings({ autostartNapCat: false, enabled: true })
console.log('patched settings:', { enabled: after.enabled, autostart: after.autostartNapCat })
console.log('after:', await q.qqSnapshot())
