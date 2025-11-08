import type { ModelLike } from './adapter.js'
import type { JsonApiDocument, JsonApiLinks, PresenterConstructor, PresenterOptions } from './types.js'

interface LegacyPresenterConstructor extends PresenterConstructor {
  plural?: string
}

interface LegacyJsonApiDocument extends JsonApiDocument {
  [key: string]: unknown
}

export default function createLegacyPresenter(Presenter: PresenterConstructor): LegacyPresenterConstructor {
  return class LegacyPresenter extends Presenter {
    static type = 'object'
    declare scope: LegacyJsonApiDocument
    _plural?: string

    constructor(scope?: JsonApiDocument) {
      // LegacyPresenter doesn't use the 'data' property, so pass an empty scope
      super(scope || ({} as JsonApiDocument))
      const ctor = Object.getPrototypeOf(this).constructor as LegacyPresenterConstructor
      this._plural = ctor.plural
      // Remove the 'data' property that the parent constructor adds
      if (!scope) {
        delete (this.scope as any).data
      }
    }

    pluralType(): string {
      return this._plural || this._type + 's'
    }

    attributes(instance: ModelLike | null): Record<string, unknown> | null {
      if (!instance) {
        return null
      }
      const attributes = { ...this._adapter.get<Record<string, unknown>>(instance) }
      const relationships = this.relationships()
      if (!relationships) {
        return attributes
      }

      for (const key in relationships) {
        let id: unknown
        const data = attributes[key]
        if (data == null) {
          id = attributes[key + 'Id']
          if (id != null) {
            attributes[key] = id
          }
        } else if (Array.isArray(data)) {
          attributes[key] = data.map((obj: Record<string, unknown>) => obj.id)
        } else {
          attributes[key] = (data as Record<string, unknown>).id
        }
      }
      return attributes
    }

    includeRelationships(scope: LegacyJsonApiDocument, instance: ModelLike): unknown[] {
      if (!scope.links) {
        scope.links = {}
      }
      const relationships = this.relationships()
      const result: unknown[] = []

      if (!relationships) {
        return result
      }

      for (const key in relationships) {
        const factory = relationships[key]
        if (!factory) throw new Error(`Presenter for ${key} in ${this._type} is not defined`)

        const presenter = new factory(scope) as LegacyPresenter

        const data = this._adapter.get(instance, key) as ModelLike | ModelLike[] | null
        if (data != null) {
          presenter.toJSON(data, { defaultPlural: true })
        }

        const type = scope[this.pluralType()] != null ? this.pluralType() : this._type
        const keyName = scope[presenter.pluralType()] != null ? presenter.pluralType() : presenter._type
        const link = { type: keyName }
        ;(scope.links as any)[`${type}.${key}`] = link
        result.push(link)
      }
      return result
    }

    toJSON(
      instanceOrCollection: ModelLike | ModelLike[] | null | undefined,
      options?: PresenterOptions,
    ): LegacyJsonApiDocument {
      const opts = options ?? {}
      // Initialize links if not present
      if (!this.scope.links) {
        this.scope.links = {}
      }
      if (Array.isArray(instanceOrCollection)) {
        const collection = instanceOrCollection
        const type = this.pluralType()
        if (!this.scope[type]) {
          this.scope[type] = []
        }
        collection.forEach((instance) => {
          return this.toJSON(instance)
        })
      } else {
        let links: JsonApiLinks | undefined
        const instance = instanceOrCollection
        let added = true
        const attrs = instance ? this.attributes(instance) : null
        if ((links = this.links())) {
          if (attrs) {
            attrs.links = links
          }
        }
        // If eg x.image already exists
        if (this.scope[this._type] && !this.scope[this.pluralType()]) {
          const existingAttrs = this.scope[this._type] as Record<string, unknown>
          if (attrs && existingAttrs.id !== attrs.id) {
            this.scope[this.pluralType()] = [this.scope[this._type]]
            delete this.scope[this._type]
            ;(this.scope[this.pluralType()] as unknown[]).push(attrs)
          } else {
            added = false
          }

          // If eg x.images already exists
        } else if (this.scope[this.pluralType()]) {
          const existing = this.scope[this.pluralType()] as Array<Record<string, unknown>>
          if (attrs && !existing.some((i) => i.id === attrs.id)) {
            existing.push(attrs)
          } else {
            added = false
          }
        } else if (opts.defaultPlural) {
          this.scope[this.pluralType()] = attrs ? [attrs] : []
        } else {
          this.scope[this._type] = attrs
        }

        if (added && instance) {
          this.includeRelationships(this.scope, instance)
        }
      }
      return this.scope
    }

    render(instanceOrCollection: ModelLike | ModelLike[] | null): LegacyJsonApiDocument {
      return this.toJSON(instanceOrCollection)
    }

    static toJSON(instanceOrCollection: ModelLike | ModelLike[] | null, options?: PresenterOptions): JsonApiDocument {
      return new this().toJSON(instanceOrCollection, options)
    }

    static render(instanceOrCollection: ModelLike | ModelLike[] | null, _options?: PresenterOptions): JsonApiDocument {
      return new this().render(instanceOrCollection)
    }
  } as LegacyPresenterConstructor
}
