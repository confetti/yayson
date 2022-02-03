const Adapter = require('./yayson/adapter')
const adapters = require('./yayson/adapters')
const presenter = require('./yayson/presenter')
const store = require('./yayson/store')

const lookupAdapter = function (nameOrAdapter) {
  if (nameOrAdapter === 'default') {
    return Adapter
  }
  return adapters[nameOrAdapter] || nameOrAdapter || Adapter
}

module.exports = function ({ adapter: nameOrAdapter } = {}) {
  const adapter = lookupAdapter(nameOrAdapter)
  const Presenter = presenter(lookupAdapter(adapter))
  const Store = store()

  return {
    Store,
    Presenter,
    Adapter,
  }
}
