import { pathToFileURL } from 'node:url'
const mod = await import(pathToFileURL('C:/Users/MRZC/.dsh/plugins/dsh-xi/lib/state.js').href)
const s = mod.buildState('C:/Users/MRZC/.dsh/plugins/dsh-xi')
console.log(JSON.stringify({ channels: s.channels, extensions: s.extensions.filter((x) => x.type === 'channel') }, null, 2))
