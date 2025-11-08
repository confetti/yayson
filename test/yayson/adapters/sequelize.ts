import { expect } from 'chai'

//eslint-disable-next-line no-undef
const SequelizeAdapter = yayson({ adapter: 'sequelize' }).Presenter.adapter

describe('SequelizeAdapter', function () {
  beforeEach(function () {})

  it('should get all object properties', function () {
    const model = {
      get() {
        return { name: 'Abraham' }
      },
    }
    model.constructor.primaryKeys = { id: {} } 

    const attributes = SequelizeAdapter.get(model)
    expect(attributes.name).to.eq('Abraham')

    delete model.constructor.primaryKeys
  })

  it('should get object property', function () {
    let args = null
    const model = {
      get() {
        args = arguments
        return 'Abraham'
      },
    }
    model.constructor.primaryKeys = { id: {} } 

    const name = SequelizeAdapter.get(model, 'name')

    expect(name).to.eq('Abraham')
    expect(args[0]).to.eq('name')

    delete model.constructor.primaryKeys
  })

  it('should get the id', function () {
    const model = {
      get(attr) {
        expect(attr).to.eq('id')
        return 5
      },
    }
    model.constructor.primaryKeys = { id: {} } 

    const id = SequelizeAdapter.id(model)
    expect(id).to.eq('5')

    delete model.constructor.primaryKeys
  })

  it('should get the id with custom pk', function () {
    const model = {
      get(attr) {
        expect(attr).to.eq('myPk')
        return 5
      },
    }
    model.constructor.primaryKeys = { myPk: {} } 

    const id = SequelizeAdapter.id(model)
    expect(id).to.eq('5')

    delete model.constructor.primaryKeys
  })

  it('should error with composite pk', function () {
    const model = {
      get(attr) {
        // should never be called
        expect(false).to.eq(true)
      },
    }
    model.constructor.primaryKeys = { myPk: {}, myPk2: {} } 

    expect(() => SequelizeAdapter.id(model)).to.throw()

    delete model.constructor.primaryKeys
  })
})
