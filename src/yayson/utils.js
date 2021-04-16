module.exports = function(_) {
  let utils
  if (_ == null) {
    _ = {}
  }
  return (utils = {
    find:
      _.find ||
      function(arr, callback) {
        for (let elem of Array.from(arr)) {
          if (callback(elem)) {
            return elem
          }
        }
        return undefined
      },

    filter:
      _.filter ||
      function(arr, callback) {
        const res = []
        for (let elem of Array.from(arr)) {
          if (callback(elem)) {
            res.push(elem)
          }
        }
        return res
      },

    values:
      _.values ||
      function(obj) {
        if (obj == null) {
          obj = {}
        }
        return Object.keys(obj).map(key => obj[key])
      },

    clone:
      _.clone ||
      function(obj) {
        if (obj == null) {
          obj = {}
        }
        const clone = {}
        for (let key in obj) {
          const val = obj[key]
          clone[key] = val
        }
        return clone
      },

    any: _.any || ((arr, callback) => utils.find(arr, callback) != null),

  })
}
