import type { ModelLike } from './adapter.js'
import { TYPE, LINKS, META, REL_LINKS, REL_META } from './symbols.js'

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
  [TYPE]?: string
  [LINKS]?: JsonApiLink
  [META]?: Record<string, unknown>
  [REL_LINKS]?: JsonApiLink
  [REL_META]?: Record<string, unknown>
}

export interface StoreModels {
  [type: string]: {
    [id: string]: StoreModel
  }
}

export interface SchemaRegistry {
  [type: string]: unknown
}

// Type inference helper for extracting model types from schemas (Zod-style with .parse() method)
export type InferSchemaType<Schema> = Schema extends { parse: (data: unknown) => infer ParsedType }
  ? ParsedType
  : unknown

export type InferModelType<Registry, TypeName extends string> = Registry extends SchemaRegistry
  ? TypeName extends keyof Registry
    ? InferSchemaType<Registry[TypeName]>
    : StoreModel
  : StoreModel

export interface StoreOptions<S extends SchemaRegistry = SchemaRegistry> {
  schemas?: S
  strict?: boolean
}

export interface ValidationError {
  type: string
  id: string
  error: unknown
}

export interface LegacyStoreOptions<S extends SchemaRegistry = SchemaRegistry> {
  types?: Record<string, string>
  schemas?: S
  strict?: boolean
}
