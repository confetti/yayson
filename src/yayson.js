// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

let _, Q
if (typeof window !== 'undefined' && window !== null) {
  ;({ Q } = window)
  ;({ _ } = window)
}

if (!Q) {
  Q = (() => {
    try {
      return typeof require === 'function' ? require('q') : undefined
    } catch (error) {}
  })()
}
if (!_) {
  _ = (() => {
    try {
      return typeof require === 'function' ? require('lodash') : undefined
    } catch (error1) {}
  })()
}
if (!_) {
  _ = (() => {
    try {
      return typeof require === 'function' ? require('underscore') : undefined
    } catch (error2) {}
  })()
}

const utils = require('./yayson/utils')(_, Q)

const Adapter = require('./yayson/adapter')
const adapters = require('./yayson/adapters')
const presenterFactory = require('./yayson/presenter')

const lookupAdapter = function(nameOrAdapter) {
  if (nameOrAdapter === 'default') {
    return Adapter
  }
  return adapters[nameOrAdapter] || nameOrAdapter || Adapter
}

const presenter = function(options) {
  if (options == null) {
    options = {}
  }
  const adapter = lookupAdapter(options.adapter)
  return presenterFactory(utils, adapter)
}

module.exports = function(param) {
  if (param == null) {
    param = {}
  }
  const { adapter } = param
  return {
    Store: require('./yayson/store')(utils),
    Presenter: presenter({ adapter }),
    Adapter
  }
}
