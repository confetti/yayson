const yayson = require('./yayson')
const legacyPresenter = require('./yayson/legacy-presenter')
const legacyStore = require('./yayson/legacy-store')

module.exports = function (options = {}) {
  const { Store, Presenter, Adapter } = yayson(options)
  return {
    Store: legacyStore(Store),
    Presenter: legacyPresenter(Presenter),
    Adapter,
  }
}


