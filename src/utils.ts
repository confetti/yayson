import { TYPE, LINKS, META, REL_LINKS, REL_META } from './yayson/symbols.js'
import type { StoreModel, JsonApiLink } from './yayson/types.js'

export { default as Adapter, type ModelLike } from './yayson/adapter.js'
export { TYPE, LINKS, META, REL_LINKS, REL_META }

export function getType(model: StoreModel): string | undefined {
  return model[TYPE]
}

export function getLinks(model: StoreModel): JsonApiLink | undefined {
  return model[LINKS]
}

export function getMeta(model: StoreModel): Record<string, unknown> | undefined {
  return model[META]
}

export function getRelationshipLinks(model: StoreModel): JsonApiLink | undefined {
  return model[REL_LINKS]
}

export function getRelationshipMeta(model: StoreModel): Record<string, unknown> | undefined {
  return model[REL_META]
}
