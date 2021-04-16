'use strict'

module.exports = {
  recursive: true,
  require: ['coffeescript/register', 'test/common.coffee'],
  diff: true,
  extension: ['js', 'coffee'],
  package: './package.json',
  reporter: 'spec',
  slow: 75,
  timeout: 10000,
  ui: 'bdd',
  spec: ['test/yayson/**/*.coffee'],
  'watch-files': ['src/**/*.coffee', 'test/**/*.coffee'],
}
