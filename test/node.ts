import './common.js'
import yayson from '../src/yayson.js'
import yaysonLegacy from '../src/legacy.js'

declare global {
   
  var yayson: typeof import('../src/yayson.js').default
   
  var yaysonLegacy: typeof import('../src/legacy.js').default
}

globalThis.yayson = yayson
globalThis.yaysonLegacy = yaysonLegacy
