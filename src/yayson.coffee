
tryRequire = (dep) ->
  try
    require dep
  catch
    undefined

@window ||= {}

Q = @window.Q
_ = @window._

Q ||= tryRequire 'q'
_ ||= tryRequire 'lodash/dist/lodash.underscore'
_ ||= tryRequire 'underscore'

utils = require('./yayson/utils')(_, Q)

Adapter = require('./yayson/adapter')
adapters = require('./yayson/adapters')
presenterFactory = require('./yayson/presenter')

lookupAdapter = (nameOrAdapter) ->
  adapters[nameOrAdapter] || Adapter

presenter = (options = {}) ->
  adapter = lookupAdapter options.adapter
  presenterFactory(utils, adapter)

yayson =
  Store: require('./yayson/store')(utils)
  presenter: presenter
  Adapter: Adapter

  # LEGACY: Remove in 2.0
  Presenter: presenter(adapter: 'sequelize')


module.exports = yayson
