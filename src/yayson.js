let _
if (typeof window !== 'undefined' && window != null) {
  _ = window._
}

if (typeof require === 'function') {
  if (!_)
    _ = (() => {
      try {
        return require('lodash')
      } catch (e) {}
    })()

  if (!_)
    _ = (() => {
      try {
        return require('underscore')
      } catch (e) {}
    })()
}

const utils = require('./yayson/utils')(_)

const Adapter = require('./yayson/adapter')
const adapters = require('./yayson/adapters')
const presenterFactory = require('./yayson/presenter')

const lookupAdapter = function (nameOrAdapter) {
  if (nameOrAdapter === 'default') {
    return Adapter
  }
  return adapters[nameOrAdapter] || nameOrAdapter || Adapter
}

const presenter = function (options = {}) {
  const adapter = lookupAdapter(options.adapter)
  return presenterFactory(utils, adapter)
}

module.exports = function ({ adapter } = {}) {
  return {
    Store: require('./yayson/store')(utils),
    Presenter: presenter({ adapter }),
    Adapter,
  }
}
