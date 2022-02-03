// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

module.exports = function () {
  class Record {
    constructor(options) {
      this.type = options.type
      this.data = options.data
    }
  }

  return class Store {
    constructor(options) {
      this.types = options.types || {}
      this.reset()
    }

    reset() {
      this.records = []
      return (this.relations = {})
    }

    toModel(rec, type, models) {
      const model = {...rec.data}
      if (!models[type][model.id]) {
        models[type][model.id] = model
      }

      const relations = this.relations[type]
      for (let attribute in relations) {
        var relationType = relations[attribute]
        model[attribute] =
          model[attribute] instanceof Array
            ? model[attribute].map((id) => this.find(relationType, id, models))
            : this.find(relationType, model[attribute], models)
      }

      return model
    }

    setupRelations(links) {
      return (() => {
        const result = []
        for (let key in links) {
          const value = links[key]
          let [type, attribute] = Array.from(key.split('.'))
          type = this.types[type] || type
          if (!this.relations[type]) {
            this.relations[type] = {}
          }
          result.push((this.relations[type][attribute] = this.types[value.type] || value.type))
        }
        return result
      })()
    }

    findRecord(type, id) {
      return this.records.find((r) => r.type === type && r.data.id === id)
    }

    findRecords(type) {
      return this.records.filter((r) => r.type === type)
    }

    retrive(type, data) {
      this.sync(data)
      const { id } = data[type]
      return this.find(type, id)
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
      type = this.types[type] || type

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
        return records.forEach(remove)
      }
    }

    sync(data) {
      this.setupRelations(data.links)

      return (() => {
        const result = []
        for (var name in data) {
          if (name === 'meta' || name === 'links') {
            continue
          }

          const value = data[name]

          const add = (d) => {
            const type = this.types[name] || name
            this.remove(type, d.id)
            return this.records.push(new Record({ type, data: d }))
          }

          if (value instanceof Array) {
            result.push(value.forEach(add))
          } else {
            result.push(add(value))
          }
        }
        return result
      })()
    }
  }
}
