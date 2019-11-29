const { expect } = require('chai')

const SequelizeAdapter = require('../../../src/yayson/adapters/sequelize.js')

describe('SequelizeAdapter', function() {
  beforeEach(function() {})

  it('should get all object properties', function() {
    const model = {
      get() {
        return { name: 'Abraham' }
      }
    }

    const attributes = SequelizeAdapter.get(model)
    expect(attributes.name).to.eq('Abraham')
  })

  it('should get object property', function() {
    let args = null
    const model = {
      get() {
        args = arguments
        return 'Abraham'
      }
    }

    const name = SequelizeAdapter.get(model, 'name')

    expect(name).to.eq('Abraham')
    expect(args[0]).to.eq('name')
  })

  return it('should get the id', function() {
    const model = {
      get(attr) {
        expect(attr).to.eq('id')
        return 5
      }
    }

    const id = SequelizeAdapter.id(model)
    expect(id).to.eq('5')
  })
})
