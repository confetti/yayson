module.exports = function () {
  class Record {
    constructor(options) {
      ;({
        id: this.id,
        type: this.type,
        attributes: this.attributes,
        relationships: this.relationships,
        links: this.links,
        meta: this.meta,
      } = options)
    }
  }

  class Store {
    //eslint-disable-next-line no-unused-vars
    constructor(options) {
      this.reset()
    }

    reset() {
      this.records = []
    }

    toModel(rec, type, models) {
      let typeAttribute
      const model = { ...(rec.attributes || {}) }
      if (model.type) {
        typeAttribute = model.type
      }

      model.id = rec.id
      model.type = rec.type
      if (!models[type]) {
        models[type] = {}
      }
      if (!models[type][rec.id]) {
        models[type][rec.id] = model
      }

      if (Object.prototype.hasOwnProperty.call(model, 'meta')) {
        model.attributes = { meta: model.meta }
        delete model.meta
      }

      if (rec.meta != null) {
        model.meta = rec.meta
      }

      if (rec.links != null) {
        model.links = rec.links
      }

      if (rec.relationships != null) {
        for (let key in rec.relationships) {
          const rel = rec.relationships[key]
          const { data } = rel
          const { links } = rel
          const { meta } = rel

          model[key] = null
          if (data == null && links == null) {
            continue
          }
          const resolve = ({ type, id }) => {
            return this.find(type, id, models)
          }
          model[key] = data instanceof Array ? data.map(resolve) : data != null ? resolve(data) : {}

          // Model of the relation
          const currentModel = model[key]

          if (currentModel != null) {
            // retain the links and meta from the relationship entry
            // use as underscore property name because the currentModel may also have a link and meta reference
            currentModel._links = links || {}
            currentModel._meta = meta || {}
          }
        }
      }

      if (typeAttribute) {
        model.type = typeAttribute
      }
      return model
    }

    findRecord(type, id) {
      return this.records.find((r) => r.type === type && r.id === id)
    }

    findRecords(type) {
      return this.records.filter((r) => r.type === type)
    }

    find(type, id, models) {
      if (models == null) {
        models = {}
      }
      const rec = this.findRecord(type, id)
      if (rec == null) {
        return null
      }
      if (!models[type]) {
        models[type] = {}
      }
      return models[type][id] || this.toModel(rec, type, models)
    }

    findAll(type, models) {
      if (models == null) {
        models = {}
      }
      const recs = this.findRecords(type)
      if (recs == null) {
        return []
      }
      recs.forEach((rec) => {
        if (!models[type]) {
          models[type] = {}
        }
        return this.toModel(rec, type, models)
      })
      return Object.values(models[type] || {})
    }

    remove(type, id) {
      const remove = (record) => {
        const index = this.records.indexOf(record)
        if (!(index < 0)) {
          return this.records.splice(index, 1)
        }
      }

      if (id != null) {
        return remove(this.findRecord(type, id))
      } else {
        const records = this.findRecords(type)
        return records.map(remove)
      }
    }

    sync(body) {
      const sync = (data) => {
        if (data == null) {
          return null
        }
        const add = (obj) => {
          const { type, id } = obj
          this.remove(type, id)
          const rec = new Record(obj)
          this.records.push(rec)
          return rec
        }

        if (data instanceof Array) {
          return data.map(add)
        } else {
          return add(data)
        }
      }

      sync(body.included)
      const recs = sync(body.data)

      if (recs == null) {
        return null
      }

      const models = {}
      let result = null

      if (recs instanceof Array) {
        result = recs.map((rec) => {
          return this.toModel(rec, rec.type, models)
        })
      } else {
        result = this.toModel(recs, recs.type, models)
      }

      if (Object.prototype.hasOwnProperty.call(body, 'links')) {
        result.links = body.links
      }

      if (Object.prototype.hasOwnProperty.call(body, 'meta')) {
        result.meta = body.meta
      }

      return result
    }
  }

  return Store
}
