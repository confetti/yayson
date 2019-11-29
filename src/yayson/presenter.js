// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = function(utils, adapter) {
  var Presenter = (function() {
    let buildLinks = undefined
    Presenter = class Presenter {
      static initClass() {
        buildLinks = function(link) {
          if (link == null) {
            return
          }
          if (link.self != null || link.related != null) {
            return link
          } else {
            return { self: link }
          }
        }

        this.adapter = adapter
        this.prototype.type = 'objects'
      }

      constructor(scope) {
        if (scope == null) {
          scope = {}
        }
        this.scope = scope
      }

      id(instance) {
        return this.constructor.adapter.id(instance)
      }

      selfLinks(instance) {}

      links() {}

      relationships() {}

      attributes(instance) {
        if (instance == null) {
          return null
        }
        const attributes = utils.clone(this.constructor.adapter.get(instance))
        delete attributes['id']
        delete attributes['type']

        const relationships = this.relationships()
        for (let key in relationships) {
          delete attributes[key]
        }
        return attributes
      }

      includeRelationships(scope, instance) {
        const relationships = this.relationships()
        return (() => {
          const result = []
          for (var key in relationships) {
            const factory =
              relationships[key] ||
              (() => {
                throw new Error(
                  `Presenter for ${key} in ${this.type} is not defined`
                )
              })()
            const presenter = new factory(scope)

            const data = this.constructor.adapter.get(instance, key)
            if (data != null) {
              result.push(presenter.toJSON(data, { include: true }))
            } else {
              result.push(undefined)
            }
          }
          return result
        })()
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
          var buildData = d => {
            return (data = {
              id: this.constructor.adapter.id(d),
              type: presenter.prototype.type
            })
          }
          const build = d => {
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
          collection.forEach(instance => {
            return this.toJSON(instance, options)
          })
        } else {
          const instance = instanceOrCollection
          let added = true
          const model = {
            id: this.id(instance),
            type: this.type,
            attributes: this.attributes(instance)
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
            if (
              !utils.any(
                this.scope.included.concat(this.scope.data),
                i => i.id === model.id && i.type === model.type
              )
            ) {
              this.scope.included.push(model)
            } else {
              added = false
            }
          } else if (this.scope.data != null) {
            if (
              !(this.scope.data instanceof Array) ||
              !utils.any(this.scope.data, i => i.id === model.id)
            ) {
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
        if (utils.isPromise(instanceOrCollection)) {
          return instanceOrCollection.then(data => this.toJSON(data, options))
        } else {
          return this.toJSON(instanceOrCollection, options)
        }
      }

      static toJSON() {
        return new this().toJSON(...arguments)
      }

      static render() {
        return new this().render(...arguments)
      }
    }
    Presenter.initClass()
    return Presenter
  })()

  return (module.exports = Presenter)
}
