'use strict'

module.exports = {
  recursive: true,
  require: ['test/node.js'],
  diff: true,
  extension: ['js'],
  package: './package.json',
  reporter: 'spec',
  slow: 75,
  timeout: 10000,
  ui: 'bdd',
  spec: ['test/yayson/**/*.js'],
  'watch-files': ['src/**/*.js', 'test/**/*.js'],
}
