import { expect } from 'chai'
import type { ModelLike } from '../../src/yayson/adapter.js'

const { Presenter: LegacyPresenter } = yaysonLegacy({ adapter: 'sequelize' })

describe('LegacyPresenter', function () {
  it('handles null', function () {
    const json = LegacyPresenter.toJSON(null)
    expect(json).to.deep.equal({ object: null, links: {} })
  })

  it('create json structure of an object', function () {
    const obj = {
      get(): unknown {
        return { foo: 'bar' }
      },
    }
    const json = LegacyPresenter.toJSON(obj)
    expect(json).to.deep.equal({ object: { foo: 'bar' }, links: {} })
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
    expect(json).to.deep.equal({
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
    expect(json).to.deep.equal({ objects: [{ id: 1 }], links: {} })
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
    expect(json).to.deep.equal({ cacti: [{ id: 1 }, { id: 2 }], links: {} })
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
    expect(json).to.deep.equal({
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
      attributes(instance: ModelLike | null): Record<string, unknown> {
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

    it('should automatically include relationship keys even when not in fields', function () {
      class TicketPresenter extends LegacyPresenter {
        static type = 'ticket'
        static fields = ['name', 'email']
      }

      class PostPresenter extends LegacyPresenter {
        static type = 'post'
        // Note: 'ticket' is not in fields, only 'ticketId' is
        static fields = ['body', 'ticketId']

        relationships() {
          return { ticket: TicketPresenter }
        }
      }

      const post = {
        get(attr?: string): unknown {
          const data = {
            id: 1,
            body: 'My post',
            ticketId: 100,
            ticket: {
              id: 100,
              get(): unknown {
                return { id: 100, name: 'John', email: 'john@example.com', secret: 'hidden' }
              },
            },
          }
          if (attr) {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test helper needs dynamic key access
            return data[attr as keyof typeof data]
          }
          return data
        },
      }
      const json = PostPresenter.toJSON(post)

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Legacy format uses dynamic property names
      const result = json as unknown as {
        post: Record<string, unknown>
        tickets: Array<Record<string, unknown>>
        links: Record<string, unknown>
      }

      // The relationship key 'ticket' should be included with the ID value
      expect(result.post).to.deep.equal({
        body: 'My post',
        ticketId: 100,
        ticket: 100, // relationship ID should be included
      })

      // The related ticket should be sideloaded
      expect(result.tickets).to.deep.equal([{ name: 'John', email: 'john@example.com' }])

      // Links should be set up
      expect(result.links['post.ticket']).to.deep.equal({ type: 'tickets' })
    })

    it('should fallback to {relation}Id when relation is null', function () {
      class TicketPresenter extends LegacyPresenter {
        static type = 'ticket'
      }

      class PostPresenter extends LegacyPresenter {
        static type = 'post'
        static fields = ['body', 'ticketId']

        relationships() {
          return { ticket: TicketPresenter }
        }
      }

      const post = {
        get(attr?: string): unknown {
          const data = {
            id: 1,
            body: 'My post',
            ticketId: 100,
            ticket: null, // relation not loaded
          }
          if (attr) {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test helper needs dynamic key access
            return data[attr as keyof typeof data]
          }
          return data
        },
      }
      const json = PostPresenter.toJSON(post)

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Legacy format uses dynamic property names
      const result = json as unknown as { post: Record<string, unknown> }

      // Should fallback to ticketId value for the ticket key
      expect(result.post).to.deep.equal({
        body: 'My post',
        ticketId: 100,
        ticket: 100, // populated from ticketId fallback
      })
    })
  })
})
