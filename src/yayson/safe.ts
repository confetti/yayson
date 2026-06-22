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
 * Normalize a caller-supplied cache to a null-prototype object, so a public
 * `models` argument that happens to be a plain `{}` can't let type="__proto__"
 * resolve through Object.prototype. Already-null-prototype caches pass through
 * unchanged (preserving identity/memoization).
 */
export function safeCache<T extends object>(cache: T | undefined): T {
  if (cache === undefined) {
    return safeObject<T>()
  }
  if (Object.getPrototypeOf(cache) === null) {
    return cache
  }
  const safe = safeObject<T>()
  Object.assign(safe, cache)
  return safe
}

const UNSAFE_KEYS = new Set<string>(['__proto__', 'constructor', 'prototype'])

export function isUnsafeKey(key: string): boolean {
  return UNSAFE_KEYS.has(key)
}
