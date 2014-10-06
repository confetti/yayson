
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

module.exports =
  Store: require('./yayson/store')(utils)
  Presenter: require('./yayson/presenter')(utils)
