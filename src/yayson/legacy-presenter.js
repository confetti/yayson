// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = function (adapter) {
  return class LegacyPresenter {
    static adapter = adapter
    static type = 'object'

    constructor(scope) {
      if (scope == null) {
        scope = {}
      }
      this.scope = scope
    }

    pluralType() {
      return this.plural || this.constructor.type + 's'
    }

    links() {}

    serialize() {}

    attributes(instance) {
      if (!instance) {
        return null
      }
      const attributes = { ...adapter.get(instance) }
      const serialize = this.serialize()
      for (let key in serialize) {
        var id
        const data = attributes[key]
        if (data == null) {
          id = attributes[key + 'Id']
          if (id != null) {
            attributes[key] = id
          }
        } else if (data instanceof Array) {
          attributes[key] = data.map((obj) => obj.id)
        } else {
          attributes[key] = data.id
        }
      }
      return attributes
    }

    relations(scope, instance) {
      if (!scope.links) {
        scope.links = {}
      }
      const serialize = this.serialize()
      return (() => {
        const result = []
        for (var key in serialize) {
          const factory =
            serialize[key] ||
            (() => {
              throw new Error(`Presenter for ${key} in ${this.constructor.type} is not defined`)
            })()
          const presenter = new factory(scope)

          const data = adapter.get(instance, key)
          if (data != null) {
            presenter.toJSON(data, { defaultPlural: true })
          }

          const type = scope[this.pluralType()] != null ? this.pluralType() : this.constructor.type
          const keyName = scope[presenter.pluralType()] != null ? presenter.pluralType() : presenter.constructor.type
          result.push((scope.links[`${type}.${key}`] = { type: keyName }))
        }
        return result
      })()
    }

    toJSON(instanceOrCollection, options) {
      let type
      if (options == null) {
        options = {}
      }
      if (instanceOrCollection instanceof Array) {
        const collection = instanceOrCollection
        if (!this.scope[(type = this.pluralType())]) {
          this.scope[type] = []
        }
        collection.forEach((instance) => {
          return this.toJSON(instance)
        })
      } else {
        let links
        const instance = instanceOrCollection
        let added = true
        const attrs = this.attributes(instance)
        if ((links = this.links())) {
          attrs.links = links
        }
        // If eg x.image already exists
        if (this.scope[this.constructor.type] && !this.scope[this.pluralType()]) {
          if (this.scope[this.constructor.type].id !== attrs.id) {
            this.scope[this.pluralType()] = [this.scope[this.constructor.type]]
            delete this.scope[this.constructor.type]
            this.scope[this.pluralType()].push(attrs)
          } else {
            added = false
          }

          // If eg x.images already exists
        } else if (this.scope[this.pluralType()]) {
          if (!this.scope[this.pluralType()].some((i) => i.id === attrs.id)) {
            this.scope[this.pluralType()].push(attrs)
          } else {
            added = false
          }
        } else if (options.defaultPlural) {
          this.scope[this.pluralType()] = [attrs]
        } else {
          this.scope[this.constructor.type] = attrs
        }

        if (added) {
          this.relations(this.scope, instance)
        }
      }
      return this.scope
    }

    render(instanceOrCollection) {
      return this.toJSON(instanceOrCollection)
    }

    static toJSON() {
      return new this().toJSON(...arguments)
    }

    static render() {
      return new this().render(...arguments)
    }
  }
}
