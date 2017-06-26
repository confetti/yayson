@window ||= {}

Q = @window.Q
_ = @window._

Q ||= (try require? 'q')
_ ||= (try require? 'lodash/dist/lodash.underscore')
_ ||= (try require? 'underscore')

utils = require('./yayson/utils')(_, Q)

Adapter = require('./yayson/adapter')
adapters = require('./yayson/adapters')
presenterFactory = require('./yayson/presenter')

lookupAdapter = (nameOrAdapter) ->
  adapters[nameOrAdapter] || nameOrAdapter || Adapter

presenter = (options = {}) ->
  adapter = lookupAdapter options.adapter
  presenterFactory(utils, adapter)

module.exports = ({adapter} = {}) ->
  Store: require('./yayson/store')(utils)
  Presenter: presenter({adapter})
  Adapter: Adapter



