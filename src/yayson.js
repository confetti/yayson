const Adapter = require('./yayson/adapter')
const adapters = require('./yayson/adapters')
const presenter = require('./yayson/presenter')
const legacyPresenter = require('./yayson/legacy-presenter')
const store = require('./yayson/store')
const legacyStore = require('./yayson/legacy-store')

const lookupAdapter = function (nameOrAdapter) {
  if (nameOrAdapter === 'default') {
    return Adapter
  }
  return adapters[nameOrAdapter] || nameOrAdapter || Adapter
}

module.exports = function (options = {}) {
  const adapter = lookupAdapter(options.adapter)
  return {
    Store: store(),
    Presenter: presenter(adapter),
    LegacyStore: legacyStore(),
    LegacyPresenter: legacyPresenter(adapter),
    Adapter,
  }
}
