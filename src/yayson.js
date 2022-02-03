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
  return presenterFactory(adapter)
}

module.exports = function ({ adapter } = {}) {
  return {
    Store: require('./yayson/store')(),
    Presenter: presenter({ adapter }),
    Adapter,
  }
}
