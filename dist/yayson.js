(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Q, tryRequire, utils, _;

tryRequire = function(dep) {
  try {
    return require(dep);
  } catch (_error) {
    return void 0;
  }
};

this.window || (this.window = {});

Q = this.window.Q;

_ = this.window._;

Q || (Q = tryRequire('q'));

_ || (_ = tryRequire('lodash/dist/lodash.underscore'));

_ || (_ = tryRequire('underscore'));

utils = require('./yayson/utils')(_, Q);

module.exports = {
  Store: require('./yayson/store')(utils),
  Presenter: require('./yayson/presenter')(utils)
};



},{"./yayson/presenter":2,"./yayson/store":3,"./yayson/utils":4}],2:[function(require,module,exports){
module.exports = function(utils) {
  var Presenter;
  Presenter = (function() {
    Presenter.prototype.name = 'object';

    Presenter.prototype.serialize = {};

    function Presenter(scope) {
      if (scope == null) {
        scope = {};
      }
      this.scope = scope;
    }

    Presenter.prototype.pluralName = function() {
      return this.plural || this.name + 's';
    };

    Presenter.prototype.links = function() {};

    Presenter.prototype.serialize = function() {};

    Presenter.prototype.attributes = function(instance) {
      var attributes, data, id, key, serialize;
      if (!instance) {
        return null;
      }
      attributes = utils.clone(instance.get());
      serialize = this.serialize();
      for (key in serialize) {
        data = attributes[key];
        if (data == null) {
          id = attributes[key + 'Id'];
          if (id != null) {
            attributes[key] = id;
          }
        } else if (data instanceof Array) {
          attributes[key] = data.map(function(obj) {
            return obj.id;
          });
        } else {
          attributes[key] = data.id;
        }
      }
      return attributes;
    };

    Presenter.prototype.relations = function(scope, instance) {
      var data, factory, key, keyName, name, presenter, serialize, _results;
      scope.links || (scope.links = {});
      serialize = this.serialize();
      _results = [];
      for (key in serialize) {
        factory = serialize[key] || (function() {
          throw new Error("Presenter for " + key + " in " + this.name + " is not defined");
        }).call(this);
        presenter = new factory(scope);
        data = instance.get(key);
        if (data != null) {
          presenter.toJSON(data, {
            defaultPlural: true
          });
        }
        name = scope[this.pluralName()] != null ? this.pluralName() : this.name;
        keyName = scope[presenter.pluralName()] != null ? presenter.pluralName() : presenter.name;
        _results.push(scope.links["" + name + "." + key] = {
          type: keyName
        });
      }
      return _results;
    };

    Presenter.prototype.toJSON = function(instanceOrCollection, options) {
      var added, attrs, collection, instance, links, _base, _name;
      if (options == null) {
        options = {};
      }
      if (instanceOrCollection instanceof Array) {
        collection = instanceOrCollection;
        (_base = this.scope)[_name = this.pluralName()] || (_base[_name] = []);
        collection.forEach((function(_this) {
          return function(instance) {
            return _this.toJSON(instance);
          };
        })(this));
      } else {
        instance = instanceOrCollection;
        added = true;
        attrs = this.attributes(instance);
        if (links = this.links()) {
          attrs.links = links;
        }
        if (this.scope[this.name] && !this.scope[this.pluralName()]) {
          if (this.scope[this.name].id !== attrs.id) {
            this.scope[this.pluralName()] = [this.scope[this.name]];
            delete this.scope[this.name];
            this.scope[this.pluralName()].push(attrs);
          } else {
            added = false;
          }
        } else if (this.scope[this.pluralName()]) {
          if (!utils.any(this.scope[this.pluralName()], function(i) {
            return i.id === attrs.id;
          })) {
            this.scope[this.pluralName()].push(attrs);
          } else {
            added = false;
          }
        } else if (options.defaultPlural) {
          this.scope[this.pluralName()] = [attrs];
        } else {
          this.scope[this.name] = attrs;
        }
        if (added) {
          this.relations(this.scope, instance);
        }
      }
      return this.scope;
    };

    Presenter.prototype.render = function(instanceOrCollection) {
      if (utils.isPromise(instanceOrCollection)) {
        return instanceOrCollection.then((function(_this) {
          return function(data) {
            return _this.toJSON(data);
          };
        })(this));
      } else {
        return this.toJSON(instanceOrCollection);
      }
    };

    Presenter.toJSON = function() {
      var _ref;
      return (_ref = new this).toJSON.apply(_ref, arguments);
    };

    Presenter.render = function() {
      var _ref;
      return (_ref = new this).render.apply(_ref, arguments);
    };

    return Presenter;

  })();
  return module.exports = Presenter;
};



},{}],3:[function(require,module,exports){
module.exports = function(utils) {
  var Record, Store, TYPES;
  TYPES = {
    'events': 'event',
    'ticketBatches': 'ticketBatch',
    'images': 'image',
    'tickets': 'ticket',
    'sponsors': 'sponsor',
    'sponsorLevels': 'sponsorLevel',
    'speakers': 'speaker',
    'organisers': 'organiser',
    'payments': 'payment'
  };
  Record = (function() {
    function Record(options) {
      this.type = options.type;
      this.data = options.data;
    }

    return Record;

  })();
  return Store = (function() {
    function Store(options) {
      this.records = [];
      this.relations = {};
    }

    Store.prototype.toModel = function(rec, type, models) {
      var attribute, model, relationType, relations, _base, _name;
      model = utils.clone(rec.data);
      (_base = models[type])[_name = model.id] || (_base[_name] = model);
      relations = this.relations[type];
      for (attribute in relations) {
        relationType = relations[attribute];
        model[attribute] = model[attribute] instanceof Array ? model[attribute].map((function(_this) {
          return function(id) {
            return _this.find(relationType, id, models);
          };
        })(this)) : this.find(relationType, model[attribute], models);
      }
      return model;
    };

    Store.prototype.setupRelations = function(links) {
      var attribute, key, type, value, _base, _ref, _results;
      _results = [];
      for (key in links) {
        value = links[key];
        _ref = key.split('.'), type = _ref[0], attribute = _ref[1];
        type = TYPES[type] || type;
        (_base = this.relations)[type] || (_base[type] = {});
        _results.push(this.relations[type][attribute] = TYPES[value.type] || value.type);
      }
      return _results;
    };

    Store.prototype.findRecord = function(type, id) {
      return utils.find(this.records, function(r) {
        return r.type === type && r.data.id === id;
      });
    };

    Store.prototype.findRecords = function(type) {
      return utils.filter(this.records, function(r) {
        return r.type === type;
      });
    };

    Store.prototype.retrive = function(type, data) {
      var id;
      this.sync(data);
      id = data[type].id;
      return this.find(type, id);
    };

    Store.prototype.find = function(type, id, models) {
      var rec;
      if (models == null) {
        models = {};
      }
      rec = this.findRecord(type, id);
      if (rec == null) {
        return null;
      }
      models[type] || (models[type] = {});
      return models[type][id] || this.toModel(rec, type, models);
    };

    Store.prototype.findAll = function(type, models) {
      var recs;
      if (models == null) {
        models = {};
      }
      recs = this.findRecords(type);
      if (recs == null) {
        return [];
      }
      recs.forEach((function(_this) {
        return function(rec) {
          models[type] || (models[type] = {});
          return _this.toModel(rec, type, models);
        };
      })(this));
      return utils.values(models[type]);
    };

    Store.prototype.remove = function(type, id) {
      var index;
      index = this.records.indexOf(this.findRecord(type, id));
      if (!(index < 0)) {
        return this.records.splice(index, 1);
      }
    };

    Store.prototype.sync = function(data) {
      var add, name, value, _results;
      this.setupRelations(data.links);
      delete data.links;
      _results = [];
      for (name in data) {
        value = data[name];
        add = (function(_this) {
          return function(d) {
            var type;
            type = TYPES[name] || name;
            _this.remove(type, d.id);
            return _this.records.push(new Record({
              type: type,
              data: d
            }));
          };
        })(this);
        if (value instanceof Array) {
          _results.push(value.forEach(add));
        } else {
          _results.push(add(value));
        }
      }
      return _results;
    };

    return Store;

  })();
};



},{}],4:[function(require,module,exports){
module.exports = function(_, Q) {
  var utils;
  if (_ == null) {
    _ = {};
  }
  if (Q == null) {
    Q = {};
  }
  return utils = {
    find: _.find || function(arr, callback) {
      var elem, _i, _len;
      for (_i = 0, _len = arr.length; _i < _len; _i++) {
        elem = arr[_i];
        if (callback(elem)) {
          return elem;
        }
      }
      return void 0;
    },
    filter: _.filter || function(arr, callback) {
      var elem, res, _i, _len;
      res = [];
      for (_i = 0, _len = arr.length; _i < _len; _i++) {
        elem = arr[_i];
        if (callback(elem)) {
          res.push(elem);
        }
      }
      return res;
    },
    values: _.values || function(obj) {
      return Object.keys(obj).map(function(key) {
        return obj[key];
      });
    },
    clone: _.clone || function(obj) {
      var clone, key, val;
      clone = {};
      for (key in obj) {
        val = obj[key];
        clone[key] = val;
      }
      return clone;
    },
    any: _.any || function(arr, callback) {
      return utils.find(arr, callback) != null;
    },
    isPromise: Q.isPromise || function(obj) {
      return obj === Object(obj) && typeof obj.promiseDispatch === "function" && typeof obj.inspect === "function";
    }
  };
};



},{}]},{},[1]);
