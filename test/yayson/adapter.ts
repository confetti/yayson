import { expect } from 'chai'

const { Adapter } = yayson()

describe('Adapter', function () {
  it('should get all object properties', function () {
    const attributes = Adapter.get({ name: 'Abraham' })
    expect(attributes.name).to.eq('Abraham')
  })

  it('should get object property', function () {
    const name = Adapter.get({ name: 'Abraham' }, 'name')
    expect(name).to.eq('Abraham')
  })

  it('should get the id', function () {
    const id = Adapter.id({ id: 5 })
    expect(id).to.eq('5')
  })

  it('should return undefined when id is null', function () {
    const id = Adapter.id({ id: null })
    expect(id).to.eq(undefined)
  })
})
