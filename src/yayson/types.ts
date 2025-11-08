import type { ModelLike } from './adapter.js'

export interface JsonApiLink extends Record<string, unknown> {
  self?: string
  related?: string
}

export interface JsonApiLinks {
  [key: string]: JsonApiLink | string | undefined
}

export interface JsonApiResourceIdentifier {
  id: string
  type: string
}

export interface JsonApiRelationship {
  data?: JsonApiResourceIdentifier | JsonApiResourceIdentifier[] | null
  links?: JsonApiLink
  meta?: Record<string, unknown>
}

export interface JsonApiRelationships {
  [key: string]: JsonApiRelationship
}

export interface JsonApiResource {
  id?: string
  type: string
  attributes?: Record<string, unknown> | null
  relationships?: JsonApiRelationships | null
  links?: JsonApiLink
  meta?: Record<string, unknown>
}

export interface JsonApiDocument {
  data: JsonApiResource | JsonApiResource[] | null
  included?: JsonApiResource[]
  links?: JsonApiLinks
  meta?: Record<string, unknown>
}

export interface PresenterOptions {
  meta?: Record<string, unknown>
  links?: JsonApiLinks
  include?: boolean
  defaultPlural?: boolean
}

export interface AdapterConstructor {
  new (): unknown
  get<T = unknown>(model: ModelLike, key?: string): T
  id(model: ModelLike): string | undefined
}

export interface PresenterConstructor {
  new (scope?: JsonApiDocument): PresenterInstance
  adapter: AdapterConstructor
  type: string
  plural?: string
  toJSON(instanceOrCollection: ModelLike | ModelLike[] | null, options?: PresenterOptions): JsonApiDocument
  render(instanceOrCollection: ModelLike | ModelLike[] | null, options?: PresenterOptions): JsonApiDocument
}

export interface PresenterInstance {
  scope: JsonApiDocument
  constructor: PresenterConstructor
  _adapter: AdapterConstructor
  _type: string
  id(instance: ModelLike): string | undefined
  selfLinks(instance: ModelLike): JsonApiLink | string | undefined
  links(instance?: ModelLike): JsonApiLinks | undefined
  relationships(): Record<string, PresenterConstructor> | undefined
  attributes(instance: ModelLike | null): Record<string, unknown> | null
  includeRelationships(scope: JsonApiDocument, instance: ModelLike): unknown[]
  buildRelationships(instance: ModelLike | null): JsonApiRelationships | null
  buildSelfLink(instance: ModelLike): JsonApiLink | undefined
  toJSON(instanceOrCollection: ModelLike | ModelLike[] | null, options?: PresenterOptions): JsonApiDocument
  render(instanceOrCollection: ModelLike | ModelLike[] | null, options?: PresenterOptions): JsonApiDocument
}

export interface StoreRecord {
  id: string
  type: string
  attributes?: Record<string, unknown>
  relationships?: JsonApiRelationships
  links?: JsonApiLink
  meta?: Record<string, unknown>
}

export interface StoreModel extends Record<string, unknown> {
  id: string
  type: string
  meta?: Record<string, unknown>
  links?: JsonApiLink
  _links?: JsonApiLinks
  _meta?: Record<string, unknown>
}

export interface StoreModels {
  [type: string]: {
    [id: string]: StoreModel
  }
}
