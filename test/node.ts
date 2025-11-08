import './common.js'
import yayson from '../src/yayson.js'
import yaysonLegacy from '../src/legacy.js'

declare global {
  // eslint-disable-next-line no-var
  var yayson: typeof import('../src/yayson.js').default
  // eslint-disable-next-line no-var
  var yaysonLegacy: typeof import('../src/legacy.js').default
}

globalThis.yayson = yayson
globalThis.yaysonLegacy = yaysonLegacy
