
module.exports = (_ = {}, Q = {}) ->
  utils =
    find: _.find || (arr, callback) ->
      for elem in arr
        return elem if callback(elem)
      return undefined

    filter: _.filter || (arr, callback) ->
      res = []
      for elem in arr
        res.push elem if callback(elem)
      res

    values: _.values || (obj) ->
      Object.keys(obj).map (key) -> obj[key]

    clone: _.clone || (obj) ->
      clone = {}
      for key, val of obj
        clone[key] = val
      clone

    any: _.any || (arr, callback) ->
      utils.find(arr, callback)?

    # stolen from https://github.com/kriskowal/q
    isPromise: Q.isPromise || (obj) ->
      obj == Object(obj) &&
      typeof obj.promiseDispatch == "function" &&
      typeof obj.inspect == "function"

