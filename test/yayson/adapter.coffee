
expect = require('chai').expect

Adapter = require('../../src/yayson.coffee')().Adapter

describe 'Adapter', ->
  it 'should get all object properties', ->
    attributes = Adapter.get {name: 'Abraham'}
    expect(attributes.name).to.eq 'Abraham'

  it 'should get object property', ->
    name = Adapter.get {name: 'Abraham'}, 'name'
    expect(name).to.eq 'Abraham'

  it 'should get the id', ->
    id = Adapter.id {id: 5}
    expect(id).to.eq '5'
