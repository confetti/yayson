const sinon = require('sinon')
const { expect } = require('chai')
const { assert } = require('chai')

const yaysonLib = yayson
const { Presenter } = yayson()

describe('Presenter', function () {
  it('handles null', function () {
    const json = Presenter.toJSON(null)
    return expect(json).to.deep.equal({
      data: null,
    })
  })

  it('create json structure of an object', function () {
    const obj = { id: 5, foo: 'bar' }
    const json = Presenter.toJSON(obj)
    expect(json).to.deep.equal({
      data: {
        type: 'objects',
        id: '5',
        attributes: {
          foo: 'bar',
        },
      },
    })
  })

  it('create json structure of an array of objects', function () {
    const obj = [
      { id: 1, foo: 'bar' },
      { id: 2, foo: 'baz' },
    ]
    const json = Presenter.toJSON(obj)
    expect(json).to.deep.equal({
      data: [
        {
          type: 'objects',
          id: '1',
          attributes: {
            foo: 'bar',
          },
        },
        {
          type: 'objects',
          id: '2',
          attributes: {
            foo: 'baz',
          },
        },
      ],
    })
  })

  it('should not include id if not specified', function () {
    const obj = { foo: 'bar' }
    const json = Presenter.toJSON(obj)
    expect(json).to.deep.equal({
      data: {
        type: 'objects',
        attributes: {
          foo: 'bar',
        },
      },
    })
  })

  it('should not dup object', function () {
    const obj = [{ id: 1 }, { id: 1 }]
    const json = Presenter.toJSON(obj)
    expect(json).to.deep.equal({

      data: [
        {
          type: 'objects',
          id: '1',
          attributes: {},
        },
      ],
    })
  })

  it('should serialize relations', function () {
    class MotorPresenter extends Presenter {
      static type = 'motors'

      relationships() {
        return { car: CarPresenter }
      }
    }

    class CarPresenter extends Presenter {
      static type = 'cars'

      relationships() {
        return { motor: MotorPresenter }
      }
    }

    const motor = {
      id: 2,
      car: null,
    }

    const car = {
      id: 1,
      motor,
    }

    motor.car = car

    const json = CarPresenter.toJSON(car)
    expect(json).to.deep.equal({
      data: {
        type: 'cars',
        id: '1',
        attributes: {},
        relationships: {
          motor: {
            data: {
              type: 'motors',
              id: '2',
            },
          },
        },
      },
      included: [
        {
          type: 'motors',
          id: '2',
          attributes: {},
          relationships: {
            car: {
              data: {
                type: 'cars',
                id: '1',
              },
            },
          },
        },
      ],
    })
  })

  it('should serialize relations array', function () {
    class WheelPresenter extends Presenter {
      static type = 'wheels'

      relationships() {
        return { bike: BikePresenter }
      }
    }

    class BikePresenter extends Presenter {
      static type = 'bikes'
      relationships() {
        return { wheels: WheelPresenter }
      }
    }

    const wheels = [
      // Intentionally adding a relation that uses the same ID as the base data
      // to prevent a regression where data of different types but of the same id
      // would not get included
      {
        id: 1,
        bike: null,
      },
      {
        id: 2,
        bike: null,
      },
      {
        id: 3,
        bike: null,
      },
    ]

    const bike = {
      id: 1,
      wheels,
    }

    for (let w of wheels) {
      w.bike = bike
    }

    const json = BikePresenter.toJSON(bike)
    expect(json).to.deep.equal({
      data: {
        type: 'bikes',
        id: '1',
        attributes: {},
        relationships: {
          wheels: {
            data: [
              {
                type: 'wheels',
                id: '1',
              },
              {
                type: 'wheels',
                id: '2',
              },
              {
                type: 'wheels',
                id: '3',
              },
            ],
          },
        },
      },
      included: [
        {
          type: 'wheels',
          id: '1',
          attributes: {},
          relationships: {
            bike: {
              data: {
                type: 'bikes',
                id: '1',
              },
            },
          },
        },
        {
          type: 'wheels',
          id: '2',
          attributes: {},
          relationships: {
            bike: {
              data: {
                type: 'bikes',
                id: '1',
              },
            },
          },
        },
        {
          type: 'wheels',
          id: '3',
          attributes: {},
          relationships: {
            bike: {
              data: {
                type: 'bikes',
                id: '1',
              },
            },
          },
        },
      ],
    })
  })

  it('should include self link', function () {
    class CarPresenter extends Presenter {
      static type = 'cars'
      selfLinks(instance) {
        return '/cars/' + this.id(instance)
      }
    }

    const json = CarPresenter.render({ id: 3 })
    expect(json.data.links.self).to.eq('/cars/3')
  })

  it('should include self and related link', function () {
    class CarPresenter extends Presenter {
      static type = 'cars'
      selfLinks(instance) {
        return {
          self: '/cars/linkage/' + this.id(instance),
          related: '/cars/' + this.id(instance),
        }
      }
    }

    const json = CarPresenter.render({ id: 3 })
    expect(json.data.links.self).to.eq('/cars/linkage/3')
    expect(json.data.links.related).to.eq('/cars/3')
  })

  it('should handle links in relationships', function () {
    class CarPresenter extends Presenter {
      static type = 'cars'

      relationships() {
        return { car: CarPresenter }
      }

      selfLinks(instance) {
        return '/cars/' + this.id(instance)
      }

      links(instance) {
        return {
          car: {
            self: this.selfLinks(instance) + '/linkage/car',
            related: this.selfLinks(instance) + '/car',
          },
        }
      }
    }

    const json = CarPresenter.render({ id: 3, car: { id: 5 } })
    expect(json.data.links.self).to.eq('/cars/3')
    expect(json.data.relationships.car.links.self).to.eq('/cars/3/linkage/car')
    expect(json.data.relationships.car.links.related).to.eq('/cars/3/car')
  })

  it('should handle links in relationships array', function () {
    class CarPresenter extends Presenter {
      static type = 'cars'

      relationships() {
        return { cars: CarPresenter }
      }

      selfLinks(instance) {
        return '/cars/' + this.id(instance)
      }

      links(instance) {
        return {
          cars: {
            self: this.selfLinks(instance) + '/linkage/cars',
            related: this.selfLinks(instance) + '/cars',
          },
        }
      }
    }

    const cars = [
      {
        id: 2,
        car: null,
      },
      {
        id: 3,
        car: null,
      },
    ]

    const car = {
      id: 1,
      cars,
    }

    for (let c of cars) {
      c.car = car
    }

    const json = CarPresenter.render(car)
    expect(json.data.links.self).to.eq('/cars/1')
    expect(json.data.relationships.cars.links).to.not.eq(undefined)
    expect(json.data.relationships.cars.links.self).to.eq(
      '/cars/1/linkage/cars'
    )
    expect(json.data.relationships.cars.links.related).to.eq('/cars/1/cars')
    expect(json.data.relationships.cars.data).to.be.an('array')
  })

  it('should handle links in relationships without data', function () {
    class CarPresenter extends Presenter {
      static type = 'cars'

      relationships() {
        return { car: CarPresenter }
      }

      selfLinks(instance) {
        return '/cars/' + this.id(instance)
      }

      links(instance) {
        return {
          car: {
            self: this.selfLinks(instance) + '/linkage/car',
            related: this.selfLinks(instance) + '/car',
          },
        }
      }
    }

    const json = CarPresenter.render({ id: 3 })
    expect(json.data.links.self).to.eq('/cars/3')
    expect(json.data.relationships.car.links.self).to.eq('/cars/3/linkage/car')
    expect(json.data.relationships.car.links.related).to.eq('/cars/3/car')
    expect(json.data.relationships.car.data).to.eq(undefined)
  })

  it('should render data: null for unspecified relationships', function () {
    class CarPresenter extends Presenter {
      static type = 'cars'

      relationships() {
        return { car: CarPresenter }
      }
    }

    const json = CarPresenter.render({ id: 3 })
    expect(json.data.relationships).to.deep.equal({
      car: {
        data: null,
      },
    })
  })

  it('should serialize in pure JS', function () {
    class EventPresenter extends Presenter {
      attributes() {
        super.attributes(...arguments)
        return { hej: 'test' }
      }
    }
    EventPresenter.prototype.type = 'events'
    const presenter = new EventPresenter()
    const json = presenter.toJSON({ id: 1 })
    expect(json.data.attributes.hej).to.eq('test')
  })

  it('should use the sequelize adapter', function () {
    const PresenterSequalize = yaysonLib({
      adapter: 'sequelize',
    }).Presenter
    const obj = {
      get(attr) {
        const attrs = { id: 5, foo: 'bar' }
        if (attr != null) {
          return attrs[attr]
        } else {
          return attrs
        }
      },
    }

    const json = PresenterSequalize.toJSON(obj)
    expect(json).to.deep.equal({
      data: {
        type: 'objects',
        id: '5',
        attributes: {
          foo: 'bar',
        },
      },
    })
  })

  it('should add meta', function () {
    const obj = { id: 1 }
    const json = Presenter.render(obj, { meta: { count: 1 } })

    expect(json.meta.count).to.eq(1)
  })

  it('should add top-level links', function () {
    const obj = { id: 1 }
    const json = Presenter.render(obj, { links: { next: '/obj?page=2' } })

    return expect(json.links.next).to.eq('/obj?page=2')
  })

  it('should exclude id from attributes', function () {
    const obj = { id: 5, foo: 'bar', type: 'some' }
    const json = Presenter.toJSON(obj)
    expect(json).to.deep.equal({
      data: {
        type: 'objects',
        id: '5',
        attributes: {
          foo: 'bar',
          type: 'some',
        },
      },
    })
  })

  it('can use custom adapters', function () {
    const obj = { id: 5, foo: 'bar' }
    const adapter = {
      id: sinon.spy(() => 1),
      get: sinon.spy(() => 'bar'),
    }
    const PresenterWithMockAdapter = yaysonLib({ adapter }).Presenter
    const json = PresenterWithMockAdapter.toJSON(obj)
    expect(adapter.id).to.have.been.calledOnce
    expect(adapter.get).to.have.been.calledOnce
  })
})
