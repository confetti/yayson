module.exports = function (adapter) {
  const buildLinks = function (link) {
    if (link == null) {
      return
    }
    if (link.self != null || link.related != null) {
      return link
    } else {
      return { self: link }
    }
  }

  return class Presenter {
    static adapter = adapter
    static type = 'objects'

    constructor(scope) {
      if (scope == null) {
        scope = {}
      }
      this.scope = scope
    }

    id(instance) {
      return this.constructor.adapter.id(instance)
    }

    //eslint-disable-next-line no-unused-vars
    selfLinks(instance) {}

    links() {}

    relationships() {}

    attributes(instance) {
      if (instance == null) {
        return null
      }
      const attributes = { ...this.constructor.adapter.get(instance) }
      delete attributes['id']

      const relationships = this.relationships()
      for (let key in relationships) {
        delete attributes[key]
      }
      return attributes
    }

    includeRelationships(scope, instance) {
      const relationships = this.relationships()
      const result = []
      for (var key in relationships) {
        const factory = relationships[key]
        if (!factory) throw new Error(`Presenter for ${key} in ${this.constructor.type} is not defined`)

        const presenter = new factory(scope)

        const data = this.constructor.adapter.get(instance, key)
        result.push(presenter.toJSON(data, { include: true }))
      }
      return result
    }

    buildRelationships(instance) {
      if (instance == null) {
        return null
      }
      const rels = this.relationships()
      const links = this.links(instance) || {}
      let relationships = null
      for (var key in rels) {
        let data = this.constructor.adapter.get(instance, key)
        var presenter = rels[key]
        var buildData = (d) => {
          return (data = {
            id: this.constructor.adapter.id(d),
            type: presenter.type,
          })
        }
        const build = (d) => {
          const rel = {}
          if (d != null) {
            rel.data = buildData(d)
          }
          if (links[key] != null) {
            rel.links = buildLinks(links[key])
          } else if (d == null) {
            rel.data = null
          }
          return rel
        }
        if (!relationships) {
          relationships = {}
        }
        if (!relationships[key]) {
          relationships[key] = {}
        }
        if (data instanceof Array) {
          relationships[key].data = data.map(buildData)
          if (links[key] != null) {
            relationships[key].links = buildLinks(links[key])
          }
        } else {
          relationships[key] = build(data)
        }
      }
      return relationships
    }

    buildSelfLink(instance) {
      return buildLinks(this.selfLinks(instance))
    }

    toJSON(instanceOrCollection, options) {
      if (options == null) {
        options = {}
      }
      if (options.meta != null) {
        this.scope.meta = options.meta
      }
      if (options.links != null) {
        this.scope.links = options.links
      }
      if (!this.scope.data) {
        this.scope.data = null
      }

      if (instanceOrCollection == null) {
        return this.scope
      }

      if (instanceOrCollection instanceof Array) {
        const collection = instanceOrCollection
        if (!this.scope.data) {
          this.scope.data = []
        }
        collection.forEach((instance) => {
          return this.toJSON(instance, options)
        })
      } else {
        const instance = instanceOrCollection
        let added = true
        const model = {
          id: this.id(instance),
          type: this.constructor.type,
          attributes: this.attributes(instance),
        }
        if (model.id === undefined) {
          delete model.id
        }
        const relationships = this.buildRelationships(instance)
        if (relationships != null) {
          model.relationships = relationships
        }
        const links = this.buildSelfLink(instance)
        if (links != null) {
          model.links = links
        }

        if (options.include) {
          if (!this.scope.included) {
            this.scope.included = []
          }
          if (!this.scope.included.concat(this.scope.data).some((i) => i.id === model.id && i.type === model.type)) {
            this.scope.included.push(model)
          } else {
            added = false
          }
        } else if (this.scope.data != null) {
          if (!(this.scope.data instanceof Array) || !this.scope.data.some((i) => i.id === model.id)) {
            this.scope.data.push(model)
          } else {
            added = false
          }
        } else {
          this.scope.data = model
        }

        if (added) {
          this.includeRelationships(this.scope, instance)
        }
      }
      return this.scope
    }

    render(instanceOrCollection, options) {
      return this.toJSON(instanceOrCollection, options)
    }

    static toJSON() {
      return new this().toJSON(...arguments)
    }

    static render() {
      return new this().render(...arguments)
    }
  }
}
