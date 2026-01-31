import type { ModelLike } from './adapter.js'
import type {
  AdapterConstructor,
  JsonApiDocument,
  JsonApiLink,
  JsonApiLinks,
  JsonApiRelationship,
  JsonApiRelationships,
  JsonApiResource,
  JsonApiResourceIdentifier,
  PresenterOptions,
} from './types.js'
import { filterByFields } from './utils.js'

function buildLinks(link: JsonApiLink | string | null | undefined): JsonApiLink | undefined {
  if (link == null) {
    return
  }
  if (typeof link === 'object' && (link.self != null || link.related != null)) {
    return link
  } else {
    return { self: String(link) }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- Return type is inferred from class
export default function createPresenter(adapter: AdapterConstructor) {
  class Presenter {
    declare ['constructor']: typeof Presenter

    static adapter = adapter
    static type = 'objects'
    static fields?: string[]

    scope: JsonApiDocument

    constructor(scope?: JsonApiDocument) {
      this.scope = scope ?? { data: null }
    }

    id(instance: ModelLike): string | undefined {
      return this.constructor.adapter.id(instance)
    }

    selfLinks(_instance: ModelLike): JsonApiLink | string | undefined {
      return undefined
    }

    links(_instance?: ModelLike): JsonApiLinks | undefined {
      return undefined
    }

    relationships(): Record<string, typeof Presenter> {
      return {}
    }

    attributes(instance: ModelLike | null): Record<string, unknown> {
      if (instance == null) {
        return {}
      }
      const attributes = { ...this.constructor.adapter.get<Record<string, unknown>>(instance) }
      delete attributes['id']

      const relationships = this.relationships()
      if (relationships) {
        for (const key in relationships) {
          delete attributes[key]
        }
      }

      return filterByFields(attributes, this.constructor.fields)
    }

    includeRelationships(scope: JsonApiDocument, instance: ModelLike): unknown[] {
      const relationships = this.relationships()
      const result: unknown[] = []
      if (!relationships) {
        return result
      }

      for (const key in relationships) {
        const factory = relationships[key]
        if (!factory) throw new Error(`Presenter for ${key} in ${this.constructor.type} is not defined`)

        const presenter = new factory(scope)

        const data = this.constructor.adapter.get<ModelLike | ModelLike[] | null>(instance, key)
        result.push(presenter.toJSON(data, { include: true }))
      }
      return result
    }

    buildRelationships(instance: ModelLike | null): JsonApiRelationships | null {
      if (instance == null) {
        return null
      }
      const rels = this.relationships()
      const links = this.links(instance) || {}
      let relationships: JsonApiRelationships | null = null

      if (!rels) {
        return null
      }

      for (const key in rels) {
        const data = this.constructor.adapter.get<ModelLike | ModelLike[] | null | undefined>(instance, key)
        const presenter = rels[key]
        const buildData = (d: ModelLike): JsonApiResourceIdentifier => {
          const id = this.constructor.adapter.id(d)
          if (!id) {
            throw new Error(`Model of type ${presenter.type} is missing an id`)
          }
          return {
            id,
            type: presenter.type,
          }
        }
        const build = (d: ModelLike | null | undefined): JsonApiRelationship => {
          const rel: JsonApiRelationship = {}
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
        if (Array.isArray(data)) {
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

    buildSelfLink(instance: ModelLike): JsonApiLink | undefined {
      return buildLinks(this.selfLinks(instance))
    }

    toJSON(
      instanceOrCollection: ModelLike | ModelLike[] | null | undefined,
      options?: PresenterOptions,
    ): JsonApiDocument {
      const opts = options ?? {}
      if (opts.meta != null) {
        this.scope.meta = opts.meta
      }
      if (opts.links != null) {
        this.scope.links = opts.links
      }
      if (!this.scope.data) {
        this.scope.data = null
      }

      if (instanceOrCollection == null) {
        return this.scope
      }

      if (Array.isArray(instanceOrCollection)) {
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
        const model: JsonApiResource = {
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

        if (opts.include) {
          if (!this.scope.included) {
            this.scope.included = []
          }
          const allResources = (this.scope.included || []).concat(
            Array.isArray(this.scope.data) ? this.scope.data : this.scope.data ? [this.scope.data] : [],
          )
          if (!allResources.some((i) => i.id === model.id && i.type === model.type)) {
            this.scope.included.push(model)
          } else {
            added = false
          }
        } else if (this.scope.data != null) {
          if (Array.isArray(this.scope.data)) {
            if (!this.scope.data.some((i) => i.id === model.id)) {
              this.scope.data.push(model)
            } else {
              added = false
            }
          } else {
            // data is a single object, convert to array if needed
            this.scope.data = model
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

    render(instanceOrCollection: ModelLike | ModelLike[] | null, options?: PresenterOptions): JsonApiDocument {
      return this.toJSON(instanceOrCollection, options)
    }

    static toJSON(instanceOrCollection: ModelLike | ModelLike[] | null, options?: PresenterOptions): JsonApiDocument {
      return new this().toJSON(instanceOrCollection, options)
    }

    static render(instanceOrCollection: ModelLike | ModelLike[] | null, options?: PresenterOptions): JsonApiDocument {
      return new this().render(instanceOrCollection, options)
    }
  }

  return Presenter
}

export type PresenterClass = ReturnType<typeof createPresenter>
export type PresenterInstance = InstanceType<PresenterClass>
