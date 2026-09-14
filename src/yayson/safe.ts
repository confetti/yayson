import type { StoreModel, StoreModels } from './types.js'

/**
 * Defenses against prototype pollution, since yayson keys lookup tables and
 * model objects by strings from untrusted documents (`type`, `id`, member
 * names). Per MDN's guidance
 * (https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Prototype_pollution):
 * caches use null-prototype objects, and "__proto__"/"constructor"/"prototype"
 * are rejected as member names.
 */

/** Null-prototype lookup table (MDN's `Object.create(null)`, never `obj.__proto__`). */
export function safeObject<T extends object>(): T {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Object.create(null) is intentionally untyped
  return Object.create(null) as T
}

/**
 * Normalize both cache levels so untrusted types and ids cannot resolve through
 * inherited properties. Preserve already-safe map identities and cached models
 * for memoization and circular relationship resolution.
 */
export function safeCache(cache: StoreModels | undefined): StoreModels {
  if (cache === undefined) {
    return safeObject<StoreModels>()
  }
  const safe = Object.getPrototypeOf(cache) === null ? cache : Object.assign(safeObject<StoreModels>(), cache)
  for (const type of Object.keys(safe)) {
    const models = safe[type]
    // The caller may supply an ordinary inner map (e.g. { people: {} }).
    // Copy it into a null-prototype map so ids like "__proto__" cannot resolve
    // to inherited values. Already-safe maps and the cached models stay unchanged.
    if (Object.getPrototypeOf(models) !== null) {
      safe[type] = Object.assign(safeObject<StoreModels[string]>(), models)
    }
  }
  return safe
}

/** Cache reads must never fall back to inherited types or ids, even before normalization. */
function getCache(cache: StoreModels, type: string): StoreModels[string] | undefined {
  return Object.hasOwn(cache, type) ? cache[type] : undefined
}

export function getCachedModel(cache: StoreModels, type: string, id: string): StoreModel | undefined {
  const models = getCache(cache, type)
  return models && Object.hasOwn(models, id) ? models[id] : undefined
}

export function getCachedModels(cache: StoreModels, type: string): StoreModel[] {
  const models = getCache(cache, type)
  return models ? Object.values(models) : []
}

/** Safe on ordinary objects too: never invoke an inherited setter such as __proto__. */
export function setCachedModel(cache: StoreModels, type: string, id: string, model: StoreModel): void {
  let models = getCache(cache, type)
  if (!models || Object.getPrototypeOf(models) !== null) {
    models = Object.assign(safeObject<StoreModels[string]>(), models)
    Object.defineProperty(cache, type, {
      value: models,
      writable: true,
      enumerable: true,
      configurable: true,
    })
  }
  Object.defineProperty(models, id, {
    value: model,
    writable: true,
    enumerable: true,
    configurable: true,
  })
}

const UNSAFE_KEYS = new Set<string>(['__proto__', 'constructor', 'prototype'])

export function isUnsafeKey(key: string): boolean {
  return UNSAFE_KEYS.has(key)
}
