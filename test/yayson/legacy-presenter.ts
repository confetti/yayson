// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { expect } from 'chai'
import type { ModelLike } from '../../src/yayson/adapter.js'

const { Presenter: LegacyPresenter } = yaysonLegacy({ adapter: 'sequelize' })

describe('LegacyPresenter', function () {
  it('handles null', function () {
    const json = LegacyPresenter.toJSON(null)
    return expect(json).to.deep.equal({ object: null, links: {} })
  })

  it('create json structure of an object', function () {
    const obj = {
      get(): unknown {
        return { foo: 'bar' }
      },
    }
    const json = LegacyPresenter.toJSON(obj)
    return expect(json).to.deep.equal({ object: { foo: 'bar' }, links: {} })
  })

  it('create json structure of two objects', function () {
    const obj = [
      {
        get(): unknown {
          return { id: 1, foo: 'bar' }
        },
      },
      {
        get(): unknown {
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
        get(): unknown {
          return { id: 1 }
        },
      },
      {
        get(): unknown {
          return { id: 1 }
        },
      },
    ]
    const json = LegacyPresenter.toJSON(obj)
    return expect(json).to.deep.equal({ objects: [{ id: 1 }], links: {} })
  })

  it('should use plural type', function () {
    class CactusPresenter extends LegacyPresenter {
      static type = 'cactus'
      static plural = 'cacti'
    }
    const obj = [
      {
        get(): unknown {
          return { id: 1 }
        },
      },
      {
        get(): unknown {
          return { id: 2 }
        },
      },
    ]
    const json = CactusPresenter.toJSON(obj)
    return expect(json).to.deep.equal({ cacti: [{ id: 1 }, { id: 2 }], links: {} })
  })

  it('should serialize relations', function () {
    class TirePresenter extends LegacyPresenter {
      static type = 'tire'

      relationships() {
        return { car: CarPresenter }
      }
    }

    class CarPresenter extends LegacyPresenter {
      static type = 'car'

      relationships() {
        return { tire: TirePresenter }
      }
    }

    const obj = {
      id: 1,
      get(attr: unknown): unknown {
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- Need to capture outer this for nested object
        const car = this
        const tire = {
          id: 2,
          get(attr: unknown): unknown {
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

  it('should relationships with custom attributes method', function () {
    class EventPresenter extends LegacyPresenter {
      attributes(instance: ModelLike | null): Record<string, unknown> | null {
        return { hej: 'test' }
      }
    }
    const presenter = new EventPresenter()
    const json = presenter.toJSON({ id: 1 })
    // Legacy presenter uses 'object' instead of 'data'
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Legacy format uses 'object' property not in standard JsonApiDocument
    expect((json as unknown as { object: Record<string, unknown> }).object.hej).to.eq('test')
  })

  describe('static fields', function () {
    it('should filter attributes to only include specified fields', function () {
      class PostPresenter extends LegacyPresenter {
        static type = 'post'
        static fields = ['title', 'body']
      }

      const post = {
        get(): unknown {
          return { id: 1, title: 'Hello', body: 'World', secret: 'hidden' }
        },
      }
      const json = PostPresenter.toJSON(post)

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Legacy format uses dynamic property names
      expect((json as unknown as { post: Record<string, unknown> }).post).to.deep.equal({
        title: 'Hello',
        body: 'World',
      })
    })

    it('should handle empty fields array', function () {
      class PostPresenter extends LegacyPresenter {
        static type = 'post'
        static fields: string[] = []
      }

      const post = {
        get(): unknown {
          return { id: 1, title: 'Hello', body: 'World' }
        },
      }
      const json = PostPresenter.toJSON(post)

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Legacy format uses dynamic property names
      expect((json as unknown as { post: Record<string, unknown> }).post).to.deep.equal({})
    })

    it('should include all attributes when fields is not defined', function () {
      class PostPresenter extends LegacyPresenter {
        static type = 'post'
      }

      const post = {
        get(): unknown {
          return { title: 'Hello', body: 'World' }
        },
      }
      const json = PostPresenter.toJSON(post)

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Legacy format uses dynamic property names
      expect((json as unknown as { post: Record<string, unknown> }).post).to.deep.equal({
        title: 'Hello',
        body: 'World',
      })
    })
  })
})
