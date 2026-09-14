import { expect } from 'chai'
import { safeCache, safeObject, getCachedModel, getCachedModels, setCachedModel } from '../../src/yayson/safe.js'
import type { StoreModels } from '../../src/yayson/types.js'

// Cache shape: cache[type][id] = model. Only the two lookup maps need null
// prototypes; model objects retain their normal properties and identity.
describe('Cache safety', function () {
  it('should create a null-prototype cache when omitted', function () {
    expect(Object.getPrototypeOf(safeCache(undefined))).to.equal(null)
  })

  it('should normalize both levels of an ordinary cache', function () {
    const model = { id: '__proto__', name: 'cached person' }
    // Brackets create an own property named __proto__. Without brackets, an
    // object literal would instead use this value as the object's prototype.
    const people = { ['__proto__']: model }
    const cache = { people }
    const safe = safeCache(cache)

    expect(Object.getPrototypeOf(safe)).to.equal(null)
    expect(Object.getPrototypeOf(safe.people)).to.equal(null)
    // Copy the unsafe maps, but keep the stored model itself by reference.
    expect(safe).not.to.equal(cache)
    expect(safe.people).not.to.equal(people)
    expect(safe.people['__proto__']).to.equal(model)
    expect(safe.people['constructor']).to.equal(undefined)
    expect(Object.getPrototypeOf(people)).to.equal(Object.prototype)
    expect(safeCache(safe)).to.equal(safe)
  })

  it('should normalize inner maps even when the outer cache already has a null prototype', function () {
    // A safe outer map does not guarantee safe inner maps: normalization must
    // inspect people too, rather than returning early based on the outer map.
    const model = { id: '__proto__', name: 'cached person' }
    const people = { ['__proto__']: model }
    const cache = safeObject<StoreModels>()
    cache.people = people
    const safe = safeCache(cache)

    expect(safe).to.equal(cache)
    expect(Object.getPrototypeOf(safe)).to.equal(null)
    expect(Object.getPrototypeOf(safe.people)).to.equal(null)
    expect(safe.people).not.to.equal(people)
    expect(safe.people['__proto__']).to.equal(model)
    expect(safe.people['constructor']).to.equal(undefined)
    expect(Object.getPrototypeOf(people)).to.equal(Object.prototype)
    expect(safeCache(safe)).to.equal(safe)
  })

  it('should preserve safe maps and model identities', function () {
    const people = safeObject<StoreModels[string]>()
    const model = { id: '1' }
    people['1'] = model
    const cache = safeObject<StoreModels>()
    cache.people = people

    // Chai's equal checks identity, not just contents. Reusing safe maps and
    // models keeps memoization and circular relationship references intact.
    expect(safeCache(cache)).to.equal(cache)
    expect(safeCache({ people }).people).to.equal(people)
    expect(safeCache(cache).people['1']).to.equal(model)
  })

  it('should ignore inherited types without relying on normalization', function () {
    // Object.create puts people on the prototype, not on cache itself.
    // Deliberately skip safeCache: reads must independently reject inherited keys.
    const cache: StoreModels = Object.create({ people: { '1': { id: '1' } } })

    expect(getCachedModel(cache, 'people', '1')).to.equal(undefined)
    expect(getCachedModels(cache, 'people')).to.deep.equal([])
    expect(getCachedModels({}, '__proto__')).to.deep.equal([])
  })

  it('should ignore inherited ids without relying on normalization', function () {
    const person = { id: '2' }
    // Ordinary bracket access would see both ids, but only id 2 belongs to this map.
    const people: StoreModels[string] = Object.create({ '1': { id: '1' } })
    people['2'] = person
    const cache = { people }

    expect(getCachedModel(cache, 'people', '1')).to.equal(undefined)
    expect(getCachedModel(cache, 'people', '__proto__')).to.equal(undefined)
    expect(getCachedModel(cache, 'people', 'constructor')).to.equal(undefined)
    expect(getCachedModel(cache, 'people', '2')).to.equal(person)
    expect(getCachedModels(cache, 'people')).to.deep.equal([person])
  })

  it('should safely write reserved type and id names into ordinary caches', function () {
    // These names are valid resource types/ids. Store them as data, rather than
    // rejecting them or invoking the inherited __proto__ setter on the outer map.
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      const cache: StoreModels = {}
      const person = { id: key }
      setCachedModel(cache, key, key, person)

      expect(Object.getPrototypeOf(cache)).to.equal(Object.prototype)
      expect(Object.hasOwn(cache, key)).to.equal(true)
      expect(Object.getPrototypeOf(cache[key])).to.equal(null)
      expect(getCachedModel(cache, key, key)).to.equal(person)
      expect(getCachedModels(cache, key)).to.deep.equal([person])
    }
  })

  it('should normalize an ordinary inner map before writing, preserving existing models', function () {
    const existing = { id: '1' }
    const people = { '1': existing }
    const cache = { people }
    const person = { id: '__proto__' }
    // The write helper must also be safe without a preceding safeCache call:
    // replace the unsafe inner map, retaining its existing cached models.
    setCachedModel(cache, 'people', '__proto__', person)

    expect(Object.getPrototypeOf(people)).to.equal(Object.prototype)
    expect(Object.getPrototypeOf(cache.people)).to.equal(null)
    expect(getCachedModel(cache, 'people', '1')).to.equal(existing)
    expect(getCachedModel(cache, 'people', '__proto__')).to.equal(person)
  })

  it('should not write into an inherited type map', function () {
    // Even a null-prototype inner map is off-limits when inherited: it may be
    // shared by other caches. The write must create this cache's own people map.
    const inheritedPeople = safeObject<StoreModels[string]>()
    const cache: StoreModels = Object.create({ people: inheritedPeople })
    const person = { id: '1' }
    setCachedModel(cache, 'people', '1', person)

    expect(Object.keys(inheritedPeople)).to.deep.equal([])
    expect(Object.hasOwn(cache, 'people')).to.equal(true)
    expect(getCachedModel(cache, 'people', '1')).to.equal(person)
  })

  it('should preserve safe map identities and allow replacing a cached model', function () {
    const people = safeObject<StoreModels[string]>()
    const cache = { people }
    const original = { id: '1' }
    // Legacy schema validation can replace a cached model after creating it.
    const replacement = { id: '1', validated: true }
    setCachedModel(cache, 'people', '1', original)
    setCachedModel(cache, 'people', '1', replacement)

    expect(cache.people).to.equal(people)
    expect(getCachedModel(cache, 'people', '1')).to.equal(replacement)
  })
})
