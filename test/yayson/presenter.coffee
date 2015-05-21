expect = require('chai').expect

{Presenter} = require('../../src/yayson.coffee')()

describe 'Presenter', ->
  it 'handles null', ->
    json = Presenter.toJSON(null)
    expect(json).to.deep.equal
      data: null

  it 'create json structure of an object', ->
    obj = {id: 5, foo: 'bar'}
    json = Presenter.toJSON(obj)
    expect(json).to.deep.equal
      data:
        type: 'objects'
        id: 5
        attributes:
          id: 5
          foo: 'bar'

  it 'create json structure of an array of objects', ->
    obj = [{id: 1, foo: 'bar'}, {id: 2, foo: 'baz'}]
    json = Presenter.toJSON(obj)
    expect(json).to.deep.equal
      data: [{
        type: 'objects'
        id: 1
        attributes:
          id: 1
          foo: 'bar'
      },{
        type: 'objects'
        id: 2
        attributes:
          id: 2
          foo: 'baz'
      }]

  it 'should not dup object', ->
    obj = [{id: 1}, {id: 1}]
    json = Presenter.toJSON(obj)
    expect(json).to.deep.equal
      data: [
        type: 'objects'
        id: 1
        attributes:
          id: 1
      ]

  it 'should serialize relations', ->
    class MotorPresenter extends Presenter
      type: 'motors'
      relationships: ->
        car: CarPresenter

    class CarPresenter extends Presenter
      type: 'cars'
      relationships: ->
        motor: MotorPresenter

    motor =
      id: 2
      car: null

    car =
      id: 1
      motor: motor

    motor.car = car

    json = CarPresenter.toJSON(car)
    expect(json).to.deep.equal
      data:
        type: 'cars'
        id: 1
        attributes:
          id: 1
        relationships:
          motor:
            data:
              type: 'motors'
              id: 2
      included: [
        type: 'motors'
        id: 2
        attributes:
          id: 2
        relationships:
          car:
            data:
              type: 'cars'
              id: 1
      ]

  it 'should include self link', ->
    class CarPresenter extends Presenter
      type: 'cars'
      selfLinks: (instance) ->
        '/cars/' + @id(instance)

    json = CarPresenter.render(id: 3)
    expect(json.data.links.self).to.eq '/cars/3'

  it 'should include self and related link', ->
    class CarPresenter extends Presenter
      type: 'cars'
      selfLinks: (instance) ->
        self: '/cars/linkage/' + @id(instance)
        related: '/cars/' + @id(instance)

    json = CarPresenter.render(id: 3)
    expect(json.data.links.self).to.eq '/cars/linkage/3'
    expect(json.data.links.related).to.eq '/cars/3'

  it 'should handle links in relationships', ->
    class CarPresenter extends Presenter
      type: 'cars'

      relationships: ->
        car: CarPresenter

      selfLinks: (instance) ->
        '/cars/' + @id(instance)

      links: (instance) ->
        car:
          self: @selfLinks(instance) + '/linkage/car'
          related: @selfLinks(instance) + '/car'

    json = CarPresenter.render(id: 3, car: id: 5)
    expect(json.data.links.self).to.eq '/cars/3'
    expect(json.data.relationships.car.links.self).to.eq '/cars/3/linkage/car'
    expect(json.data.relationships.car.links.related).to.eq '/cars/3/car'

  it 'should serialize in pure JS', ->
    `
    var EventPresenter = function () { Presenter.call(this); }
    EventPresenter.prototype = new Presenter()
    EventPresenter.prototype.attributes = function() {
      return {hej: 'test'}
    }
    var presenter = new EventPresenter()
    var json = presenter.toJSON({id: 1})
    `
    expect(json.data.attributes.hej).to.eq 'test'


  it 'should use the sequelize adapter', ->
    {Presenter} = require('../../src/yayson.coffee')(adapter: 'sequelize')
    obj = get: (attr) ->
      attrs = {id: 5, foo: 'bar'}
      if attr?
        attrs[attr]
      else
        attrs

    json = Presenter.toJSON(obj)
    expect(json).to.deep.equal
      data:
        type: 'objects'
        id: 5
        attributes:
          id: 5
          foo: 'bar'

