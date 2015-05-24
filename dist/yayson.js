(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Adapter, Q, _, adapters, lookupAdapter, presenter, presenterFactory, tryRequire, utils;

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

Adapter = require('./yayson/adapter');

adapters = require('./yayson/adapters');

presenterFactory = require('./yayson/presenter');

lookupAdapter = function(nameOrAdapter) {
  return adapters[nameOrAdapter] || Adapter;
};

presenter = function(options) {
  var adapter;
  if (options == null) {
    options = {};
  }
  adapter = lookupAdapter(options.adapter);
  return presenterFactory(utils, adapter);
};

module.exports = function(arg) {
  var adapter;
  adapter = (arg != null ? arg : {}).adapter;
  return {
    Store: require('./yayson/store')(utils),
    Presenter: presenter({
      adapter: adapter
    }),
    Adapter: Adapter
  };
};



},{"./yayson/adapter":2,"./yayson/adapters":3,"./yayson/presenter":5,"./yayson/store":6,"./yayson/utils":7}],2:[function(require,module,exports){
var Adapter;

Adapter = (function() {
  function Adapter() {}

  Adapter.get = function(model, key) {
    if (key) {
      return model[key];
    }
    return model;
  };

  Adapter.id = function(model) {
    return "" + (this.get(model, 'id'));
  };

  return Adapter;

})();

module.exports = Adapter;



},{}],3:[function(require,module,exports){
module.exports = {
  sequelize: require('./sequelize')
};



},{"./sequelize":4}],4:[function(require,module,exports){
var Adapter, SequelizeAdapter,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Adapter = require('../adapter');

SequelizeAdapter = (function(superClass) {
  extend(SequelizeAdapter, superClass);

  function SequelizeAdapter() {
    return SequelizeAdapter.__super__.constructor.apply(this, arguments);
  }

  SequelizeAdapter.get = function(model, key) {
    if (model != null) {
      return model.get(key);
    }
  };

  return SequelizeAdapter;

})(Adapter);

module.exports = SequelizeAdapter;



},{"../adapter":2}],5:[function(require,module,exports){
module.exports = function(utils, adapter) {
  var Presenter;
  Presenter = (function() {
    var buildLinks;

    buildLinks = function(link) {
      if (link == null) {
        return;
      }
      if ((link.self != null) || (link.related != null)) {
        return link;
      } else {
        return {
          self: link
        };
      }
    };

    Presenter.adapter = adapter;

    Presenter.prototype.type = 'objects';

    function Presenter(scope) {
      if (scope == null) {
        scope = {};
      }
      this.scope = scope;
    }

    Presenter.prototype.id = function(instance) {
      return adapter.id(instance);
    };

    Presenter.prototype.selfLinks = function(instance) {};

    Presenter.prototype.links = function() {};

    Presenter.prototype.relationships = function() {};

    Presenter.prototype.attributes = function(instance) {
      var attributes, key, relationships;
      if (instance == null) {
        return null;
      }
      attributes = utils.clone(adapter.get(instance));
      if ('id' in attributes) {
        delete attributes['id'];
      }
      relationships = this.relationships();
      for (key in relationships) {
        delete attributes[key];
      }
      return attributes;
    };

    Presenter.prototype.includeRelationships = function(scope, instance) {
      var data, factory, key, presenter, relationships, results;
      relationships = this.relationships();
      results = [];
      for (key in relationships) {
        factory = relationships[key] || (function() {
          throw new Error("Presenter for " + key + " in " + this.type + " is not defined");
        }).call(this);
        presenter = new factory(scope);
        data = adapter.get(instance, key);
        if (data != null) {
          results.push(presenter.toJSON(data, {
            include: true
          }));
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    Presenter.prototype.buildRelationships = function(instance) {
      var build, data, key, links, presenter, relationships, rels;
      if (instance == null) {
        return null;
      }
      rels = this.relationships();
      links = this.links(instance) || {};
      relationships = null;
      for (key in rels) {
        data = adapter.get(instance, key);
        presenter = rels[key];
        build = function(d) {
          var rel;
          rel = {
            data: {
              id: adapter.id(d),
              type: presenter.prototype.type
            }
          };
          if (links[key] != null) {
            rel.links = buildLinks(links[key]);
          }
          return rel;
        };
        relationships || (relationships = {});
        relationships[key] || (relationships[key] = {});
        relationships[key] = data instanceof Array ? data.map(build) : data != null ? build(data) : null;
      }
      return relationships;
    };

    Presenter.prototype.buildSelfLink = function(instance) {
      return buildLinks(this.selfLinks(instance));
    };

    Presenter.prototype.toJSON = function(instanceOrCollection, options) {
      var added, base, base1, base2, collection, instance, links, model, relationships;
      if (options == null) {
        options = {};
      }
      if (options.meta != null) {
        this.scope.meta = options.meta;
      }
      (base = this.scope).data || (base.data = null);
      if (instanceOrCollection == null) {
        return this.scope;
      }
      if (instanceOrCollection instanceof Array) {
        collection = instanceOrCollection;
        (base1 = this.scope).data || (base1.data = []);
        collection.forEach((function(_this) {
          return function(instance) {
            return _this.toJSON(instance);
          };
        })(this));
      } else {
        instance = instanceOrCollection;
        added = true;
        model = {
          id: this.id(instance),
          type: this.type,
          attributes: this.attributes(instance)
        };
        relationships = this.buildRelationships(instance);
        if (relationships != null) {
          model.relationships = relationships;
        }
        links = this.buildSelfLink(instance);
        if (links != null) {
          model.links = links;
        }
        if (options.include) {
          (base2 = this.scope).included || (base2.included = []);
          if (!utils.any(this.scope.included.concat(this.scope.data), function(i) {
            return i.id === model.id;
          })) {
            this.scope.included.push(model);
          } else {
            added = false;
          }
        } else if (this.scope.data != null) {
          if (!utils.any(this.scope.data, function(i) {
            return i.id === model.id;
          })) {
            this.scope.data.push(model);
          } else {
            added = false;
          }
        } else {
          this.scope.data = model;
        }
        if (added) {
          this.includeRelationships(this.scope, instance);
        }
      }
      return this.scope;
    };

    Presenter.prototype.render = function(instanceOrCollection, options) {
      if (utils.isPromise(instanceOrCollection)) {
        return instanceOrCollection.then((function(_this) {
          return function(data) {
            return _this.toJSON(data, options);
          };
        })(this));
      } else {
        return this.toJSON(instanceOrCollection, options);
      }
    };

    Presenter.toJSON = function() {
      var ref;
      return (ref = new this).toJSON.apply(ref, arguments);
    };

    Presenter.render = function() {
      var ref;
      return (ref = new this).render.apply(ref, arguments);
    };

    return Presenter;

  })();
  return module.exports = Presenter;
};



},{}],6:[function(require,module,exports){
module.exports = function(utils) {
  var Record, Store;
  Record = (function() {
    function Record(options) {
      this.id = options.id, this.type = options.type, this.attributes = options.attributes, this.relationships = options.relationships;
    }

    return Record;

  })();
  return Store = (function() {
    function Store(options) {
      this.reset();
    }

    Store.prototype.reset = function() {
      this.records = [];
      return this.relations = {};
    };

    Store.prototype.toModel = function(rec, type, models) {
      var base, data, key, model, name, ref, rel, resolve;
      model = utils.clone(rec.attributes) || {};
      model.id = rec.id;
      models[type] || (models[type] = {});
      (base = models[type])[name = rec.id] || (base[name] = model);
      if (rec.relationships != null) {
        ref = rec.relationships;
        for (key in ref) {
          rel = ref[key];
          data = rel.data;
          resolve = (function(_this) {
            return function(arg) {
              var id, type;
              type = arg.type, id = arg.id;
              return _this.find(type, id, models);
            };
          })(this);
          model[key] = data instanceof Array ? data.map(resolve) : resolve(data);
        }
      }
      return model;
    };

    Store.prototype.findRecord = function(type, id) {
      return utils.find(this.records, function(r) {
        return r.type === type && r.id === id;
      });
    };

    Store.prototype.findRecords = function(type) {
      return utils.filter(this.records, function(r) {
        return r.type === type;
      });
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
      var records, remove;
      remove = (function(_this) {
        return function(record) {
          var index;
          index = _this.records.indexOf(record);
          if (!(index < 0)) {
            return _this.records.splice(index, 1);
          }
        };
      })(this);
      if (id != null) {
        return remove(this.findRecord(type, id));
      } else {
        records = this.findRecords(type);
        return records.map(remove);
      }
    };

    Store.prototype.sync = function(body) {
      var models, recs, sync;
      sync = (function(_this) {
        return function(data) {
          var add;
          if (data == null) {
            return null;
          }
          add = function(obj) {
            var id, rec, type;
            type = obj.type, id = obj.id;
            rec = new Record(obj);
            _this.records.push(rec);
            return rec;
          };
          if (data instanceof Array) {
            return data.map(add);
          } else {
            return add(data);
          }
        };
      })(this);
      sync(body.included);
      recs = sync(body.data);
      if (recs == null) {
        return null;
      }
      models = {};
      if (recs instanceof Array) {
        return recs.map((function(_this) {
          return function(rec) {
            return _this.toModel(rec, rec.type, models);
          };
        })(this));
      } else {
        return this.toModel(recs, recs.type, models);
      }
    };

    return Store;

  })();
};



},{}],7:[function(require,module,exports){
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
      var elem, i, len;
      for (i = 0, len = arr.length; i < len; i++) {
        elem = arr[i];
        if (callback(elem)) {
          return elem;
        }
      }
      return void 0;
    },
    filter: _.filter || function(arr, callback) {
      var elem, i, len, res;
      res = [];
      for (i = 0, len = arr.length; i < len; i++) {
        elem = arr[i];
        if (callback(elem)) {
          res.push(elem);
        }
      }
      return res;
    },
    values: _.values || function(obj) {
      if (obj == null) {
        obj = {};
      }
      return Object.keys(obj).map(function(key) {
        return obj[key];
      });
    },
    clone: _.clone || function(obj) {
      var clone, key, val;
      if (obj == null) {
        obj = {};
      }
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
