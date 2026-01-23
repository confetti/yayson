import sinon from 'sinon'
import { expect } from 'chai'
import { assert } from 'chai'
import type { ModelLike } from '../../src/yayson/adapter.js'
import type { JsonApiResource } from '../../src/yayson/types.js'

const yaysonLib = yayson

const { Presenter } = yayson()

function assertSingleResource(data: unknown): asserts data is JsonApiResource {
  assert(!Array.isArray(data) && data !== null, 'Expected single resource')
}

describe('Presenter', function (): void {
  it('handles null', function (): void {
    const json = Presenter.toJSON(null)
    expect(json).to.deep.equal({
      data: null,
    })
  })

  it('create json structure of an object', function (): void {
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

  it('create json structure of an array of objects', function (): void {
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

  it('should not include id if not specified', function (): void {
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

  it('should not dup object', function (): void {
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

  it('should serialize relations', function (): void {
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

    const motor: { id: number; car: { id: number; motor: unknown } | null } = {
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

  it('should serialize relations array', function (): void {
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

    type Bike = { id: number; wheels: Wheel[] }
    type Wheel = { id: number; bike: Bike | null }

    const wheels: Wheel[] = [
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

    const bike: Bike = {
      id: 1,
      wheels,
    }

    for (const w of wheels) {
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

  it('should include self link', function (): void {
    class CarPresenter extends Presenter {
      static type = 'cars'
      selfLinks(instance: ModelLike) {
        return '/cars/' + this.id(instance)
      }
    }

    const json = CarPresenter.render({ id: 3 })
    assertSingleResource(json.data)
    expect(json.data.links?.self).to.eq('/cars/3')
  })

  it('should include self and related link', function (): void {
    class CarPresenter extends Presenter {
      static type = 'cars'
      selfLinks(instance: ModelLike) {
        return {
          self: '/cars/linkage/' + this.id(instance),
          related: '/cars/' + this.id(instance),
        }
      }
    }

    const json = CarPresenter.render({ id: 3 })
    assertSingleResource(json.data)
    expect(json.data.links?.self).to.eq('/cars/linkage/3')
    expect(json.data.links?.related).to.eq('/cars/3')
  })

  it('should handle links in relationships', function (): void {
    class CarPresenter extends Presenter {
      static type = 'cars'

      relationships() {
        return { car: CarPresenter }
      }

      selfLinks(instance: ModelLike) {
        return '/cars/' + this.id(instance)
      }

      links(instance: ModelLike) {
        return {
          car: {
            self: this.selfLinks(instance) + '/linkage/car',
            related: this.selfLinks(instance) + '/car',
          },
        }
      }
    }

    const json = CarPresenter.render({ id: 3, car: { id: 5 } })
    assertSingleResource(json.data)
    expect(json.data.links!.self).to.eq('/cars/3')
    expect(json.data.relationships!.car.links!.self).to.eq('/cars/3/linkage/car')
    expect(json.data.relationships!.car.links!.related).to.eq('/cars/3/car')
  })

  it('should handle links in relationships array', function (): void {
    class CarPresenter extends Presenter {
      static type = 'cars'

      relationships() {
        return { cars: CarPresenter }
      }

      selfLinks(instance: ModelLike) {
        return '/cars/' + this.id(instance)
      }

      links(instance: ModelLike) {
        return {
          cars: {
            self: this.selfLinks(instance) + '/linkage/cars',
            related: this.selfLinks(instance) + '/cars',
          },
        }
      }
    }

    type Car = { id: number; cars: CarWithRef[] }
    type CarWithRef = { id: number; car: Car | null }

    const cars: CarWithRef[] = [
      {
        id: 2,
        car: null,
      },
      {
        id: 3,
        car: null,
      },
    ]

    const car: Car = {
      id: 1,
      cars,
    }

    for (const c of cars) {
      c.car = car
    }

    const json = CarPresenter.render(car)
    assertSingleResource(json.data)
    expect(json.data.links!.self).to.eq('/cars/1')
    expect(json.data.relationships!.cars.links).to.not.eq(undefined)
    expect(json.data.relationships!.cars.links!.self).to.eq('/cars/1/linkage/cars')
    expect(json.data.relationships!.cars.links!.related).to.eq('/cars/1/cars')
    expect(json.data.relationships!.cars.data).to.be.an('array')
  })

  it('should handle links in relationships without data', function (): void {
    class CarPresenter extends Presenter {
      static type = 'cars'

      relationships() {
        return { car: CarPresenter }
      }

      selfLinks(instance: ModelLike) {
        return '/cars/' + this.id(instance)
      }

      links(instance: ModelLike) {
        return {
          car: {
            self: this.selfLinks(instance) + '/linkage/car',
            related: this.selfLinks(instance) + '/car',
          },
        }
      }
    }

    const json = CarPresenter.render({ id: 3 })
    assertSingleResource(json.data)
    expect(json.data.links!.self).to.eq('/cars/3')
    expect(json.data.relationships!.car.links!.self).to.eq('/cars/3/linkage/car')
    expect(json.data.relationships!.car.links!.related).to.eq('/cars/3/car')
    expect(json.data.relationships!.car.data).to.eq(undefined)
  })

  it('should render data: null for unspecified relationships', function (): void {
    class CarPresenter extends Presenter {
      static type = 'cars'

      relationships() {
        return { car: CarPresenter }
      }
    }

    const json = CarPresenter.render({ id: 3 })
    assertSingleResource(json.data)
    expect(json.data.relationships).to.deep.equal({
      car: {
        data: null,
      },
    })
  })

  it('should serialize in pure JS', function (): void {
    class EventPresenter extends Presenter {
      static type = 'events'
      attributes(instance: ModelLike | null): Record<string, unknown> | null {
        super.attributes(instance)
        return { hej: 'test' }
      }
    }
    const presenter = new EventPresenter()
    const json = presenter.toJSON({ id: 1 })
    assertSingleResource(json.data)
    expect(json.data.attributes!.hej).to.eq('test')
  })

  it('should use the sequelize adapter', function (): void {
    const PresenterSequalize = yaysonLib({
      adapter: 'sequelize',
    }).Presenter
    const obj = {
      get(attr?: string): unknown {
        const attrs: Record<string, unknown> = { id: 5, foo: 'bar' }
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

  it('should add meta', function (): void {
    const obj = { id: 1 }
    const json = Presenter.render(obj, { meta: { count: 1 } })

    expect(json.meta!.count).to.eq(1)
  })

  it('should add top-level links', function (): void {
    const obj = { id: 1 }
    const json = Presenter.render(obj, { links: { next: '/obj?page=2' } })

    expect(json.links!.next).to.eq('/obj?page=2')
  })

  it('should exclude id from attributes', function (): void {
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

  it('can use custom adapters', function (): void {
    const obj = { id: 5, foo: 'bar' }
    const idSpy = sinon.spy((): string | undefined => '1')
    const getSpy = sinon.spy(<T = unknown>(): T => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test mock returns fixed value for any type
      return 'bar' as T
    })

    class MockAdapter {
      static id(): string | undefined {
        return idSpy()
      }
      static get<T = unknown>(): T {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test mock adapter returns unknown from spy, must cast to generic T
        return getSpy() as T
      }
    }

    const PresenterWithMockAdapter = yaysonLib({ adapter: MockAdapter }).Presenter
    const json = PresenterWithMockAdapter.toJSON(obj)
    expect(idSpy).to.have.been.calledOnce
    expect(getSpy).to.have.been.calledOnce
  })
})
