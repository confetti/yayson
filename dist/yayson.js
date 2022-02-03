/*! yayson v 3.0.0 (https://github.com/confetti/yayson) by Johannes Edelstam <johannes@edelst.am>, Jonny Strömberg <jonny.stromberg@gmail.com> */
var yayson =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

class Adapter {
  static get(model, key) {
    if (key) {
      return model[key];
    }

    return model;
  }

  static id(model) {
    const id = this.get(model, 'id');

    if (id === undefined) {
      return id;
    }

    return "".concat(id);
  }

}

module.exports = Adapter;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

const Adapter = __webpack_require__(0);

const adapters = __webpack_require__(2);

const presenterFactory = __webpack_require__(4);

const lookupAdapter = function (nameOrAdapter) {
  if (nameOrAdapter === 'default') {
    return Adapter;
  }

  return adapters[nameOrAdapter] || nameOrAdapter || Adapter;
};

const presenter = function () {
  let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const adapter = lookupAdapter(options.adapter);
  return presenterFactory(adapter);
};

module.exports = function () {
  let {
    adapter
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return {
    Store: __webpack_require__(5)(),
    Presenter: presenter({
      adapter
    }),
    Adapter
  };
};

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = {
  sequelize: __webpack_require__(3)
};

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

const Adapter = __webpack_require__(0);

class SequelizeAdapter extends Adapter {
  static get(model, key) {
    if (model != null) {
      return model.get(key);
    }
  }

}

module.exports = SequelizeAdapter;

/***/ }),
/* 4 */
/***/ (function(module, exports) {

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

module.exports = function (adapter) {
  var _class, _temp;

  const buildLinks = function (link) {
    if (link == null) {
      return;
    }

    if (link.self != null || link.related != null) {
      return link;
    } else {
      return {
        self: link
      };
    }
  };

  return _temp = _class = class Presenter {
    constructor(scope) {
      if (scope == null) {
        scope = {};
      }

      this.scope = scope;
    }

    id(instance) {
      return this.constructor.adapter.id(instance);
    }

    selfLinks(instance) {}

    links() {}

    relationships() {}

    attributes(instance) {
      if (instance == null) {
        return null;
      }

      const attributes = { ...this.constructor.adapter.get(instance)
      };
      delete attributes['id'];
      const relationships = this.relationships();

      for (let key in relationships) {
        delete attributes[key];
      }

      return attributes;
    }

    includeRelationships(scope, instance) {
      const relationships = this.relationships();
      const result = [];

      for (var key in relationships) {
        const factory = relationships[key];
        if (!factory) throw new Error("Presenter for ".concat(key, " in ").concat(this.type, " is not defined"));
        const presenter = new factory(scope);
        const data = this.constructor.adapter.get(instance, key);
        result.push(presenter.toJSON(data, {
          include: true
        }));
      }

      return result;
    }

    buildRelationships(instance) {
      if (instance == null) {
        return null;
      }

      const rels = this.relationships();
      const links = this.links(instance) || {};
      let relationships = null;

      for (var key in rels) {
        let data = this.constructor.adapter.get(instance, key);
        var presenter = rels[key];

        var buildData = d => {
          return data = {
            id: this.constructor.adapter.id(d),
            type: presenter.type
          };
        };

        const build = d => {
          const rel = {};

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

        if (!relationships) {
          relationships = {};
        }

        if (!relationships[key]) {
          relationships[key] = {};
        }

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
    }

    buildSelfLink(instance) {
      return buildLinks(this.selfLinks(instance));
    }

    toJSON(instanceOrCollection, options) {
      if (options == null) {
        options = {};
      }

      if (options.meta != null) {
        this.scope.meta = options.meta;
      }

      if (options.links != null) {
        this.scope.links = options.links;
      }

      if (!this.scope.data) {
        this.scope.data = null;
      }

      if (instanceOrCollection == null) {
        return this.scope;
      }

      if (instanceOrCollection instanceof Array) {
        const collection = instanceOrCollection;

        if (!this.scope.data) {
          this.scope.data = [];
        }

        collection.forEach(instance => {
          return this.toJSON(instance, options);
        });
      } else {
        const instance = instanceOrCollection;
        let added = true;
        const model = {
          id: this.id(instance),
          type: this.constructor.type,
          attributes: this.attributes(instance)
        };

        if (model.id === undefined) {
          delete model.id;
        }

        const relationships = this.buildRelationships(instance);

        if (relationships != null) {
          model.relationships = relationships;
        }

        const links = this.buildSelfLink(instance);

        if (links != null) {
          model.links = links;
        }

        if (options.include) {
          if (!this.scope.included) {
            this.scope.included = [];
          }

          if (!this.scope.included.concat(this.scope.data).some(i => i.id === model.id && i.type === model.type)) {
            this.scope.included.push(model);
          } else {
            added = false;
          }
        } else if (this.scope.data != null) {
          if (!(this.scope.data instanceof Array) || !this.scope.data.some(i => i.id === model.id)) {
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
    }

    render(instanceOrCollection, options) {
      return this.toJSON(instanceOrCollection, options);
    }

    static toJSON() {
      return new this().toJSON(...arguments);
    }

    static render() {
      return new this().render(...arguments);
    }

  }, _defineProperty(_class, "adapter", adapter), _defineProperty(_class, "type", 'objects'), _temp;
};

/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = function () {
  class Record {
    constructor(options) {
      ;
      ({
        id: this.id,
        type: this.type,
        attributes: this.attributes,
        relationships: this.relationships,
        links: this.links,
        meta: this.meta
      } = options);
    }

  }

  class Store {
    constructor(options) {
      this.reset();
    }

    reset() {
      this.records = [];
      return this.relations = {};
    }

    toModel(rec, type, models) {
      let typeAttribute;
      const model = { ...(rec.attributes || {})
      };

      if (model.type) {
        typeAttribute = model.type;
      }

      model.id = rec.id;
      model.type = rec.type;

      if (!models[type]) {
        models[type] = {};
      }

      if (!models[type][rec.id]) {
        models[type][rec.id] = model;
      }

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
        for (let key in rec.relationships) {
          const rel = rec.relationships[key];
          const {
            data
          } = rel;
          const {
            links
          } = rel;
          const {
            meta
          } = rel;
          model[key] = null;

          if (data == null && links == null) {
            continue;
          }

          const resolve = _ref => {
            let {
              type,
              id
            } = _ref;
            return this.find(type, id, models);
          };

          model[key] = data instanceof Array ? data.map(resolve) : data != null ? resolve(data) : {}; // Model of the relation

          const currentModel = model[key];

          if (currentModel != null) {
            // retain the links and meta from the relationship entry
            // use as underscore property name because the currentModel may also have a link and meta reference
            currentModel._links = links || {};
            currentModel._meta = meta || {};
          }
        }
      }

      if (typeAttribute) {
        model.type = typeAttribute;
      }

      return model;
    }

    findRecord(type, id) {
      return this.records.find(r => r.type === type && r.id === id);
    }

    findRecords(type) {
      return this.records.filter(r => r.type === type);
    }

    find(type, id, models) {
      if (models == null) {
        models = {};
      }

      const rec = this.findRecord(type, id);

      if (rec == null) {
        return null;
      }

      if (!models[type]) {
        models[type] = {};
      }

      return models[type][id] || this.toModel(rec, type, models);
    }

    findAll(type, models) {
      if (models == null) {
        models = {};
      }

      const recs = this.findRecords(type);

      if (recs == null) {
        return [];
      }

      recs.forEach(rec => {
        if (!models[type]) {
          models[type] = {};
        }

        return this.toModel(rec, type, models);
      });
      return Object.values(models[type] || {});
    }

    remove(type, id) {
      const remove = record => {
        const index = this.records.indexOf(record);

        if (!(index < 0)) {
          return this.records.splice(index, 1);
        }
      };

      if (id != null) {
        return remove(this.findRecord(type, id));
      } else {
        const records = this.findRecords(type);
        return records.map(remove);
      }
    }

    sync(body) {
      const sync = data => {
        if (data == null) {
          return null;
        }

        const add = obj => {
          const {
            type,
            id
          } = obj;
          this.remove(type, id);
          const rec = new Record(obj);
          this.records.push(rec);
          return rec;
        };

        if (data instanceof Array) {
          return data.map(add);
        } else {
          return add(data);
        }
      };

      sync(body.included);
      const recs = sync(body.data);

      if (recs == null) {
        return null;
      }

      const models = {};
      let result = null;

      if (recs instanceof Array) {
        result = recs.map(rec => {
          return this.toModel(rec, rec.type, models);
        });
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
    }

  }

  return Store;
};

/***/ })
/******/ ]);