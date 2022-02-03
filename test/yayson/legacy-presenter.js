// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { expect } = require('chai')

//eslint-disable-next-line no-undef
const yaysonLib = yayson
//eslint-disable-next-line no-undef
const { LegacyPresenter } = yayson({ adapter: 'sequelize' })

describe('LegacyPresenter', function () {
  it('handles null', function () {
    const json = LegacyPresenter.toJSON(null)
    return expect(json).to.deep.equal({ object: null, links: {} })
  })

  it('create json structure of an object', function () {
    const obj = {
      get() {
        return { foo: 'bar' }
      },
    }
    const json = LegacyPresenter.toJSON(obj)
    return expect(json).to.deep.equal({ object: { foo: 'bar' }, links: {} })
  })

  it('create json structure of two objects', function () {
    const obj = [
      {
        get() {
          return { id: 1, foo: 'bar' }
        },
      },
      {
        get() {
          return { id: 2, foo: 'bar' }
        },
      },
    ]
    const json = LegacyPresenter.toJSON(obj)
    return expect(json).to.deep.equal({
      objects: [
        { id: 1, foo: 'bar' },
        { id: 2, foo: 'bar' },
      ],
      links: {},
    })
  })

  it('should not dup object', function () {
    const obj = [
      {
        get() {
          return { id: 1 }
        },
      },
      {
        get() {
          return { id: 1 }
        },
      },
    ]
    const json = LegacyPresenter.toJSON(obj)
    return expect(json).to.deep.equal({ objects: [{ id: 1 }], links: {} })
  })

  it('should serialize relations', function () {
    class TirePresenter extends LegacyPresenter {
      static type = 'tire'

      serialize() {
        return { car: CarPresenter }
      }
    }

    class CarPresenter extends LegacyPresenter {
      static type = 'car'

      serialize() {
        return { tire: TirePresenter }
      }
    }

    const obj = {
      id: 1,
      get(attr) {
        const car = this
        const tire = {
          id: 2,
          get(attr) {
            if (!attr) {
              return {
                id: this.id,
                car,
              }
            } else if (attr === 'car') {
              return car
            }
          },
        }

        if (!attr) {
          return {
            id: this.id,
            tire,
          }
        } else if (attr === 'tire') {
          return tire
        }
      },
    }

    const json = CarPresenter.toJSON(obj)
    return expect(json).to.deep.equal({
      car: { id: 1, tire: 2 },
      links: {
        'tires.car': { type: 'car' },
        'car.tire': { type: 'tires' },
      },
      tires: [{ id: 2, car: 1 }],
    })
  })

  it('should serialize with custom attributes method', function () {
    class EventPresenter extends LegacyPresenter {
      attributes() {
        return { hej: 'test' }
      }
    }
    const presenter = new EventPresenter()
    const json = presenter.toJSON({ id: 1 })
    return expect(json.object.hej).to.eq('test')
  })
})
