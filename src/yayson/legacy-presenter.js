module.exports = function (Presenter) {
  return class LegacyPresenter extends Presenter {
    static type = 'object'

    pluralType() {
      return this.constructor.plural || this.constructor.type + 's'
    }

    attributes(instance) {
      if (!instance) {
        return null
      }
      const attributes = { ...this.constructor.adapter.get(instance) }
      const relationships = this.relationships()
      for (let key in relationships) {
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

    includeRelationships(scope, instance) {
      if (!scope.links) {
        scope.links = {}
      }
      const relationships = this.relationships()
      const result = []
      for (var key in relationships) {
        const factory = relationships[key]
        if (!factory) throw new Error(`Presenter for ${key} in ${this.constructor.type} is not defined`)

        const presenter = new factory(scope)

        const data = this.constructor.adapter.get(instance, key)
        if (data != null) {
          presenter.toJSON(data, { defaultPlural: true })
        }

        const type = scope[this.pluralType()] != null ? this.pluralType() : this.constructor.type
        const keyName = scope[presenter.pluralType()] != null ? presenter.pluralType() : presenter.constructor.type
        const link = { type: keyName }
        scope.links[`${type}.${key}`] = link
        result.push(link)
      }
      return result
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
          this.includeRelationships(this.scope, instance)
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
