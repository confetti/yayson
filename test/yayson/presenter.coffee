expect = require('chai').expect

Presenter = require('../../src/yayson.coffee').Presenter

describe 'Presenter', ->
  it 'handles null', ->
    json = Presenter.toJSON(null)
    expect(json).to.deep.equal {object: null, links: {}}

  it 'create json structure of an object', ->
    obj = {get: -> {foo: 'bar'}}
    json = Presenter.toJSON(obj)
    expect(json).to.deep.equal {object: {foo: 'bar'}, links: {}}

  it 'create json structure of an object', ->
    obj = [{get: -> {id: 1, foo: 'bar'}}, {get: -> {id: 2, foo: 'bar'}}]
    json = Presenter.toJSON(obj)
    expect(json).to.deep.equal {objects: [{id: 1, foo: 'bar'}, {id: 2, foo: 'bar'}], links: {}}

  it 'should not dup object', ->
    obj = [{get: -> {id: 1}}, {get: -> {id: 1}}]
    json = Presenter.toJSON(obj)
    expect(json).to.deep.equal {objects: [{id: 1}], links: {}}

  it 'should serialize relations', ->
    class TirePresenter extends Presenter
      name: 'tire'
      serialize: ->
        car: CarPresenter

    class CarPresenter extends Presenter
      name: 'car'
      serialize: ->
        tire: TirePresenter

    obj =
      id: 1
      get: (attr) ->
        car = this
        tire =
          id: 2
          get: (attr) ->
            unless attr
              id: @id
              car: car
            else if attr == 'car'
              car

        unless attr
          id: @id
          tire: tire
        else if attr == 'tire'
          tire

    json = CarPresenter.toJSON(obj)
    expect(json).to.deep.equal
      car: {id: 1, tire: 2}
      links:
        'tires.car': type: 'car'
        'car.tire': type: 'tires'
      tires: [id: 2, car: 1]

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
      expect(json.object.hej).to.eq 'test'

