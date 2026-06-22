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

const UNSAFE_KEYS = new Set<string>(['__proto__', 'constructor', 'prototype'])

export function isUnsafeKey(key: string): boolean {
  return UNSAFE_KEYS.has(key)
}
