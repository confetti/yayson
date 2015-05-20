
expect = require('chai').expect

SequelizeAdapter = require('../../../src/yayson/adapters/sequelize.coffee')

describe 'SequelizeAdapter', ->
  beforeEach ->

  it 'should get all object properties', ->
    model = get: ->
      name: 'Abraham'

    attributes = SequelizeAdapter.get model
    expect(attributes.name).to.eq 'Abraham'

  it 'should get object property', ->
    args = null
    model = get: ->
      args = arguments
      'Abraham'

    name = SequelizeAdapter.get model, 'name'

    expect(name).to.eq 'Abraham'
    expect(args[0]).to.eq 'name'

  it 'should get the id', ->
    model =
      get: (attr) ->
        expect(attr).to.eq 'id'
        5

    id = SequelizeAdapter.id model
    expect(id).to.eq 5
