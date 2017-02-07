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
        id: '5'
        attributes:
          foo: 'bar'

  it 'create json structure of an array of objects', ->
    obj = [{id: 1, foo: 'bar'}, {id: 2, foo: 'baz'}]
    json = Presenter.toJSON(obj)
    expect(json).to.deep.equal
      data: [{
        type: 'objects'
        id: '1'
        attributes:
          foo: 'bar'
      },{
        type: 'objects'
        id: '2'
        attributes:
          foo: 'baz'
      }]

  it 'should not include id if not specified', ->
    obj = {foo: 'bar'}
    json = Presenter.toJSON(obj)
    expect(json).to.deep.equal
      data:
        type: 'objects'
        attributes:
          foo: 'bar'

  it 'should not dup object', ->
    obj = [{id: 1}, {id: 1}]
    json = Presenter.toJSON(obj)
    expect(json).to.deep.equal
      data: [
        type: 'objects'
        id: '1'
        attributes: {}
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
        id: '1'
        attributes: {}
        relationships:
          motor:
            data:
              type: 'motors'
              id: '2'
      included: [
        type: 'motors'
        id: '2'
        attributes: {}
        relationships:
          car:
            data:
              type: 'cars'
              id: '1'
      ]

  it 'should serialize relations array', ->
    class WheelPresenter extends Presenter
      type: 'wheels'
      relationships: ->
        bike: BikePresenter

    class BikePresenter extends Presenter
      type: 'bikes'
      relationships: ->
        wheels: WheelPresenter

    wheels =[
      # Intentionally adding a relation that uses the same ID as the base data
      # to prevent a regression where data of different types but of the same id
      # would not get included
      {
        id: 1
        bike: null
      },
      {
        id: 2
        bike: null
      },
      {
        id: 3
        bike: null
      }
    ]

    bike =
      id: 1
      wheels: wheels

    for w in wheels
      w.bike = bike

    json = BikePresenter.toJSON(bike)
    expect(json).to.deep.equal
      data:
        type: 'bikes'
        id: '1'
        attributes: {}
        relationships:
          wheels:
            data:[
              {
                type: 'wheels'
                id: '1'
              },
              {
                type: 'wheels'
                id: '2'
              },
              {
                type: 'wheels'
                id: '3'
              }
            ]
      included: [
        {
          type: 'wheels'
          id: '1'
          attributes: {}
          relationships:
            bike:
              data:
                type: 'bikes'
                id: '1'
        },
        {
          type: 'wheels'
          id: '2'
          attributes: {}
          relationships:
            bike:
              data:
                type: 'bikes'
                id: '1'
        },
        {
          type: 'wheels'
          id: '3'
          attributes: {}
          relationships:
            bike:
              data:
                type: 'bikes'
                id: '1'
        }
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

  it 'should handle links in relationships array', ->

    class CarPresenter extends Presenter
      type: 'cars'

      relationships: ->
        cars: CarPresenter

      selfLinks: (instance) ->
        '/cars/' + @id(instance)

      links: (instance) ->
        cars:
          self: @selfLinks(instance) + '/linkage/cars'
          related: @selfLinks(instance) + '/cars'



    cars =[
      {
        id: 2
        car: null
      },
      {
        id: 3
        car: null
      }
    ]

    car =
      id: 1
      cars: cars

    for c in cars
      c.car = car

    json = CarPresenter.render(car)
    expect(json.data.links.self).to.eq '/cars/1'
    expect(json.data.relationships.cars.links).to.not.eq undefined
    expect(json.data.relationships.cars.links.self).to.eq '/cars/1/linkage/cars'
    expect(json.data.relationships.cars.links.related).to.eq '/cars/1/cars'
    expect(json.data.relationships.cars.data).to.be.an 'array'

  it 'should handle links in relationships without data', ->
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

    json = CarPresenter.render(id: 3)
    expect(json.data.links.self).to.eq '/cars/3'
    expect(json.data.relationships.car.links.self).to.eq '/cars/3/linkage/car'
    expect(json.data.relationships.car.links.related).to.eq '/cars/3/car'
    expect(json.data.relationships.car.data).to.eq undefined

  it 'should use id function on the relationship presenter', ->
    class CarPresenter extends Presenter
      type: 'cars'
      relationships: ->
        wheels: WheelPresenter

    class WheelPresenter extends Presenter
      type: 'wheels'
      id: (instance) ->
        return instance.fakeId

    car = {
      id: 2
      wheels: [
        {
          fakeId: 123,
          id: 456
        }
      ]
    }

    json = CarPresenter.render car
    expect(json.data.relationships.wheels.data[0].id).to.eq 123

  it 'should render data: null for unspecified relationships', ->
    class CarPresenter extends Presenter
      type: 'cars'

      relationships: ->
        car: CarPresenter

    json = CarPresenter.render(id: 3)
    expect(json.data.relationships).to.deep.equal
      car:
        data: null

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
    PresenterSequalize = require('../../src/yayson.coffee')(adapter: 'sequelize').Presenter
    obj = get: (attr) ->
      attrs = {id: 5, foo: 'bar'}
      if attr?
        attrs[attr]
      else
        attrs

    json = PresenterSequalize.toJSON(obj)
    expect(json).to.deep.equal
      data:
        type: 'objects'
        id: '5'
        attributes:
          foo: 'bar'

  it 'should add meta', ->
    obj = {id: 1}
    json = Presenter.render(obj, meta: count: 1)

    expect(json.meta.count).to.eq 1

  it 'should exclude id and type from attributes', ->
    obj = {id: 5, foo: 'bar', type: 'some'}
    json = Presenter.toJSON(obj)
    expect(json).to.deep.equal
      data:
        type: 'objects'
        id: '5'
        attributes:
          foo: 'bar'
