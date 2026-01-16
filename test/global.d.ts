declare global {
  var yayson: typeof import('../src/yayson.js').default
  var yaysonLegacy: typeof import('../src/legacy.js').default
}

export {}
