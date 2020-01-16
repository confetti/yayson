(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.yayson = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
var Adapter, Q, _, adapters, lookupAdapter, presenter, presenterFactory, utils;

if (typeof window !== "undefined" && window !== null) {
  Q = window.Q;
  _ = window._;
}

Q || (Q = ((function() {
  try {
    return typeof require === "function" ? require('q') : void 0;
  } catch (error) {}
})()));

_ || (_ = ((function() {
  try {
    return typeof require === "function" ? require('lodash') : void 0;
  } catch (error) {}
})()));

_ || (_ = ((function() {
  try {
    return typeof require === "function" ? require('underscore') : void 0;
  } catch (error) {}
})()));

utils = require('./yayson/utils')(_, Q);

Adapter = require('./yayson/adapter');

adapters = require('./yayson/adapters');

presenterFactory = require('./yayson/presenter');

lookupAdapter = function(nameOrAdapter) {
  if (nameOrAdapter === 'default') {
    return Adapter;
  }
  return adapters[nameOrAdapter] || nameOrAdapter || Adapter;
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


},{"./yayson/adapter":3,"./yayson/adapters":4,"./yayson/presenter":6,"./yayson/store":7,"./yayson/utils":8,"lodash":1,"q":1,"underscore":1}],3:[function(require,module,exports){
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
    var id;
    id = this.get(model, 'id');
    if (id === void 0) {
      return id;
    }
    return "" + id;
  };

  return Adapter;

})();

module.exports = Adapter;


},{}],4:[function(require,module,exports){
module.exports = {
  sequelize: require('./sequelize')
};


},{"./sequelize":5}],5:[function(require,module,exports){
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


},{"../adapter":3}],6:[function(require,module,exports){
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
      return this.constructor.adapter.id(instance);
    };

    Presenter.prototype.selfLinks = function(instance) {};

    Presenter.prototype.links = function() {};

    Presenter.prototype.relationships = function() {};

    Presenter.prototype.attributes = function(instance) {
      var attributes, key, relationships;
      if (instance == null) {
        return null;
      }
      attributes = utils.clone(this.constructor.adapter.get(instance));
      delete attributes['id'];
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
        data = this.constructor.adapter.get(instance, key);
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
      var build, buildData, data, key, links, presenter, relationships, rels;
      if (instance == null) {
        return null;
      }
      rels = this.relationships();
      links = this.links(instance) || {};
      relationships = null;
      for (key in rels) {
        data = this.constructor.adapter.get(instance, key);
        presenter = rels[key];
        buildData = (function(_this) {
          return function(d) {
            return data = {
              id: _this.constructor.adapter.id(d),
              type: presenter.prototype.type
            };
          };
        })(this);
        build = (function(_this) {
          return function(d) {
            var rel;
            rel = {};
            if (d != null) {
              rel.data = buildData(d);
            }
            if (links[key] != null) {
              rel.links = buildLinks(links[key]);
            } else if (d == null) {
              rel.data = null;
            }
            return rel;
          };
        })(this);
        relationships || (relationships = {});
        relationships[key] || (relationships[key] = {});
        if (data instanceof Array) {
          relationships[key].data = data.map(buildData);
          if (links[key] != null) {
            relationships[key].links = buildLinks(links[key]);
          }
        } else {
          relationships[key] = build(data);
        }
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
            return _this.toJSON(instance, options);
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
        if (model.id === void 0) {
          delete model.id;
        }
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
            return i.id === model.id && i.type === model.type;
          })) {
            this.scope.included.push(model);
          } else {
            added = false;
          }
        } else if (this.scope.data != null) {
          if (!(this.scope.data instanceof Array && utils.any(this.scope.data, function(i) {
            return i.id === model.id;
          }))) {
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


},{}],7:[function(require,module,exports){
module.exports = function(utils) {
  var Record, Store;
  Record = (function() {
    function Record(options) {
      this.id = options.id, this.type = options.type, this.attributes = options.attributes, this.relationships = options.relationships, this.links = options.links, this.meta = options.meta;
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
      var base, currentModel, data, key, links, meta, model, name, ref, rel, resolve, typeAttribute;
      model = utils.clone(rec.attributes) || {};
      if (model.type) {
        typeAttribute = model.type;
      }
      model.id = rec.id;
      model.type = rec.type;
      models[type] || (models[type] = {});
      (base = models[type])[name = rec.id] || (base[name] = model);
      if (model.hasOwnProperty('meta')) {
        model.attributes = {
          meta: model.meta
        };
        delete model.meta;
      }
      if (rec.meta != null) {
        model.meta = rec.meta;
      }
      if (rec.links != null) {
        model.links = rec.links;
      }
      if (rec.relationships != null) {
        ref = rec.relationships;
        for (key in ref) {
          rel = ref[key];
          data = rel.data;
          links = rel.links;
          meta = rel.meta;
          model[key] = null;
          if (!((data != null) || (links != null))) {
            continue;
          }
          resolve = (function(_this) {
            return function(arg) {
              var id, type;
              type = arg.type, id = arg.id;
              return _this.find(type, id, models);
            };
          })(this);
          model[key] = data instanceof Array ? data.map(resolve) : data != null ? resolve(data) : {};
          currentModel = model[key];
          if (currentModel != null) {
            currentModel._links = links || {};
            currentModel._meta = meta || {};
          }
        }
      }
      if (typeAttribute) {
        model.type = typeAttribute;
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
      var models, recs, result, sync;
      sync = (function(_this) {
        return function(data) {
          var add;
          if (data == null) {
            return null;
          }
          add = function(obj) {
            var id, rec, type;
            type = obj.type, id = obj.id;
            _this.remove(type, id);
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
      result = null;
      if (recs instanceof Array) {
        result = recs.map((function(_this) {
          return function(rec) {
            return _this.toModel(rec, rec.type, models);
          };
        })(this));
      } else {
        result = this.toModel(recs, recs.type, models);
      }
      if (body.hasOwnProperty('links')) {
        result.links = body.links;
      }
      if (body.hasOwnProperty('meta')) {
        result.meta = body.meta;
      }
      return result;
    };

    return Store;

  })();
};


},{}],8:[function(require,module,exports){
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


},{}]},{},[2])(2)
});
