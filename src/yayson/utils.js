/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

module.exports = function(_, Q) {
  let utils;
  if (_ == null) { _ = {}; }
  if (Q == null) { Q = {}; }
  return utils = {
    find: _.find || function(arr, callback) {
      for (let elem of Array.from(arr)) {
        if (callback(elem)) { return elem; }
      }
      return undefined;
    },

    filter: _.filter || function(arr, callback) {
      const res = [];
      for (let elem of Array.from(arr)) {
        if (callback(elem)) { res.push(elem); }
      }
      return res;
    },

    values: _.values || function(obj) {
      if (obj == null) { obj = {}; }
      return Object.keys(obj).map(key => obj[key]);
    },

    clone: _.clone || function(obj) {
      if (obj == null) { obj = {}; }
      const clone = {};
      for (let key in obj) {
        const val = obj[key];
        clone[key] = val;
      }
      return clone;
    },

    any: _.any || ((arr, callback) => utils.find(arr, callback) != null),

    // stolen from https://github.com/kriskowal/q
    isPromise: Q.isPromise || (obj => (obj === Object(obj)) &&
    (typeof obj.promiseDispatch === "function") &&
    (typeof obj.inspect === "function"))
  };
};

