'use strict'

module.exports = {
  recursive: true,
  require: ['test/node.ts'],
  diff: true,
  extension: ['ts'],
  package: './package.json',
  reporter: 'spec',
  slow: 75,
  timeout: 10000,
  ui: 'bdd',
  spec: ['test/yayson/**/*.ts'],
  'watch-files': ['src/**/*.ts', 'test/**/*.ts'],
  'node-option': ['import=tsx/esm'],
}
