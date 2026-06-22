import { expect } from 'chai'
import { z } from 'zod'
import yayson from '../../src/yayson.js'
import { TYPE, LINKS, REL_LINKS, REL_META, META } from '../../src/utils.js'

const { Store } = yayson()

describe('Store', function () {
  beforeEach(function () {
    this.store = new Store()

    this.store.records = []
  })

  it('should sync all events', function () {
    const events = this.store.syncAll({
      data: {
        type: 'events',
        id: 1,
        attributes: {
          name: 'Demo',
        },
      },
    })

    expect(events.length).to.equal(1)
    expect(events[0].name).to.equal('Demo')
  })

  it('should allow an attribute namned type', function () {
    this.store.syncAll({
      data: {
        type: 'events',
        id: 1,
        attributes: {
          name: 'Demo',
          type: 'party',
        },
      },
    })

    const event = this.store.find('events', 1)
    expect(event.name).to.equal('Demo')
    expect(event.type).to.equal('party')
  })

  it('should find an event', function () {
    this.store.syncAll({
      data: {
        type: 'events',
        id: 1,
        attributes: {
          name: 'Demo',
        },
      },
    })

    const event = this.store.find('events', 1)
    expect(event.id).to.equal(1)
    expect(event[TYPE]).to.equal('events')
    expect(event.name).to.equal('Demo')
  })

  it('should preserve numeric ids', function () {
    this.store.syncAll({
      data: {
        type: 'events',
        id: 1,
        attributes: {
          name: 'Demo',
        },
      },
    })

    const event = this.store.find('events', 1)
    expect(event).to.not.be.null
    expect(event.id).to.equal(1)
    expect(event.name).to.equal('Demo')
  })

  it('should find by string id when stored as number', function () {
    this.store.syncAll({
      data: {
        type: 'events',
        id: 1,
        attributes: {
          name: 'Demo',
        },
      },
    })

    const event = this.store.find('events', '1')
    expect(event).to.not.be.null
    expect(event.id).to.equal(1)
    expect(event.name).to.equal('Demo')
  })

  it('should handle relations with duplicates', function () {
    this.store.syncAll({
      data: {
        type: 'events',
        id: 1,
        attributes: {
          name: 'Demo',
        },
        relationships: {
          images: {
            data: [
              {
                type: 'images',
                id: 2,
              },
            ],
          },
        },
      },
      included: [
        {
          type: 'images',
          id: 2,
          attributes: {
            name: 'Header',
          },
        },
        {
          type: 'images',
          id: 2,
          attributes: {
            name: 'Header',
          },
        },
      ],
    })

    const event = this.store.find('events', 1)
    expect(event.name).to.equal('Demo')
    expect(event.images.length).to.equal(1)

    const images = this.store.findAll('images')
    expect(images.length).to.eq(1)
  })

  it('should create stub for relationship without included entry', function () {
    this.store.syncAll({
      data: {
        type: 'events',
        id: 1,
        attributes: {
          name: 'Demo',
        },
        relationships: {
          image: {
            data: {
              type: 'images',
              id: 2,
            },
          },
        },
      },
    })
    const event = this.store.find('events', 1)

    expect(event.name).to.equal('Demo')
    expect(event.image).to.not.be.null
    expect(event.image.id).to.equal(2)
    expect(event.image[TYPE]).to.equal('images')
  })

  it('should create stubs for array relationships without included entries', function () {
    this.store.syncAll({
      data: {
        type: 'events',
        id: 1,
        attributes: {
          name: 'Demo',
        },
        relationships: {
          images: {
            data: [
              { type: 'images', id: 2 },
              { type: 'images', id: 3 },
            ],
          },
        },
      },
    })
    const event = this.store.find('events', 1)

    expect(event.name).to.equal('Demo')
    expect(event.images.length).to.equal(2)
    expect(event.images[0].id).to.equal(2)
    expect(event.images[0][TYPE]).to.equal('images')
    expect(event.images[1].id).to.equal(3)
    expect(event.images[1][TYPE]).to.equal('images')
  })

  it('should handle JSON API create/update payloads with relationship linkage', function () {
    const result = this.store.sync({
      data: {
        type: 'photos',
        id: '1',
        attributes: { title: 'Ember Hamster' },
        relationships: {
          photographer: { data: { type: 'people', id: '9' } },
        },
      },
    })

    expect(result.title).to.equal('Ember Hamster')
    expect(result.photographer).to.not.be.null
    expect(result.photographer.id).to.equal('9')
    expect(result.photographer[TYPE]).to.equal('people')
  })

  it('should treat relationship with null id as empty', function () {
    // Per JSON:API spec, a resource identifier must have a string id.
    // A null id is invalid and should be treated as an empty relationship.
    const result = this.store.sync({
      data: {
        type: 'speakers',
        id: '1',
        attributes: { name: 'Jane' },
        relationships: {
          image: { data: { type: 'images', id: null } },
        },
      },
    })

    expect(result.name).to.equal('Jane')
    expect(result.image).to.be.null
  })

  it('should filter out array items with null id', function () {
    const result = this.store.sync({
      data: {
        type: 'events',
        id: '1',
        attributes: { name: 'Conference' },
        relationships: {
          images: {
            data: [
              { type: 'images', id: '10' },
              { type: 'images', id: null },
              { type: 'images', id: '11' },
            ],
          },
        },
      },
    })

    expect(result.name).to.equal('Conference')
    expect(result.images).to.have.length(2)
    expect(result.images[0].id).to.equal('10')
    expect(result.images[1].id).to.equal('11')
  })

  it('should build model from document without id (create payload)', function () {
    // Per JSON:API spec: "The id member is not required when the resource object
    // originates at the client and represents a new resource to be created on the server."
    const model = this.store.build({
      data: {
        type: 'events',
        attributes: {
          name: 'New Event',
        },
      },
    })

    expect(model.name).to.equal('New Event')
    expect(model.id).to.be.undefined
    expect(model[TYPE]).to.equal('events')

    // build() should not store anything
    expect(this.store.records.length).to.equal(0)
  })

  it('should throw when build receives array data', function () {
    expect(() =>
      this.store.build({
        data: [
          { type: 'events', attributes: { name: 'Event 1' } },
          { type: 'events', attributes: { name: 'Event 2' } },
        ],
      }),
    ).to.throw('build() expects a single resource in data, not null or an array')
  })

  it('should throw when build receives null data', function () {
    expect(() => this.store.build({ data: null })).to.throw(
      'build() expects a single resource in data, not null or an array',
    )
  })

  it('should build model with id when provided', function () {
    const model = this.store.build({
      data: {
        type: 'events',
        id: '123',
        attributes: {
          name: 'Existing Event',
        },
      },
    })

    expect(model.name).to.equal('Existing Event')
    expect(model.id).to.equal('123')
    expect(model[TYPE]).to.equal('events')

    // build() should not store anything
    expect(this.store.records.length).to.equal(0)
  })

  it('should build model with relationship stubs when not in store', function () {
    const model = this.store.build({
      data: {
        type: 'events',
        attributes: { name: 'New Event' },
        relationships: {
          image: { data: { type: 'images', id: '5' } },
          tags: {
            data: [
              { type: 'tags', id: '1' },
              { type: 'tags', id: '2' },
            ],
          },
        },
      },
    })

    expect(model.name).to.equal('New Event')
    expect(model.image).to.not.be.null
    expect(model.image.id).to.equal('5')
    expect(model.image[TYPE]).to.equal('images')
    expect(model.tags).to.have.length(2)
    expect(model.tags[0].id).to.equal('1')
    expect(model.tags[1].id).to.equal('2')
  })

  it('should build model with resolved relationships when in store', function () {
    // First sync some data into the store
    this.store.syncAll({
      data: [
        { type: 'images', id: '5', attributes: { url: 'http://example.com/img.jpg' } },
        { type: 'tags', id: '1', attributes: { name: 'tech' } },
        { type: 'tags', id: '2', attributes: { name: 'news' } },
      ],
    })

    // Now build a new event that references those
    const model = this.store.build({
      data: {
        type: 'events',
        attributes: { name: 'New Event' },
        relationships: {
          image: { data: { type: 'images', id: '5' } },
          tags: {
            data: [
              { type: 'tags', id: '1' },
              { type: 'tags', id: '2' },
              { type: 'tags', id: '99' }, // Not in store - should be stub
            ],
          },
        },
      },
    })

    expect(model.name).to.equal('New Event')
    // Image should be fully resolved from store
    expect(model.image.id).to.equal('5')
    expect(model.image.url).to.equal('http://example.com/img.jpg')
    // Tags should be resolved, except the one not in store
    expect(model.tags).to.have.length(3)
    expect(model.tags[0].name).to.equal('tech')
    expect(model.tags[1].name).to.equal('news')
    expect(model.tags[2].id).to.equal('99')
    expect(model.tags[2].name).to.be.undefined // stub, not resolved
  })

  it('should build model via static method without instance', function () {
    const model = Store.build({
      data: {
        type: 'events',
        attributes: { name: 'Static Build' },
      },
    })

    expect(model.name).to.equal('Static Build')
    expect(model[TYPE]).to.equal('events')
    expect(model.id).to.be.undefined
  })

  it('should handle more circular relations', function () {
    this.store.syncAll({
      data: {
        type: 'events',
        id: 1,
        attributes: {
          name: 'Demo',
        },
        relationships: {
          images: {
            data: [
              {
                type: 'images',
                id: 2,
              },
            ],
          },
        },
      },
      included: [
        {
          type: 'images',
          id: 2,
          attributes: {
            name: 'Header',
          },
          relationships: {
            event: {
              data: {
                type: 'events',
                id: 1,
              },
            },
          },
        },
      ],
    })

    const event = this.store.find('events', 1)
    expect(event.images[0].event).to.equal(event)
    expect(event.name).to.equal('Demo')
    expect(event.images[0].event.name).to.equal('Demo')
    expect(event.images[0].name).to.equal('Header')
    expect(event.images[0].event.id).to.equal(1)
  })

  it('should return a event with all associated objects', function () {
    this.store.syncAll({
      data: {
        type: 'events',
        id: 1,
        attributes: {
          name: 'Nordic.js',
          slug: 'nordicjs',
        },
        relationships: {
          images: {
            data: [
              { type: 'images', id: 1 },
              { type: 'images', id: 2 },
              { type: 'images', id: 3 },
            ],
          },
          organisers: {
            data: [
              { type: 'organisers', id: 1 },
              { type: 'organisers', id: 2 },
            ],
          },
        },
      },
      included: [
        {
          type: 'organisers',
          id: 1,
          attributes: {
            firstName: 'Jonny',
          },
          relationships: {
            event: {
              data: { type: 'events', id: 1 },
            },
            image: {
              data: { type: 'images', id: 2 },
            },
          },
        },
        {
          type: 'organisers',
          id: 2,
          attributes: {
            firstName: 'Martina',
          },
          relationships: {
            event: {
              data: { type: 'events', id: 1 },
            },
            image: {
              data: { type: 'images', id: 3 },
            },
          },
        },
        {
          type: 'images',
          id: 1,
          attributes: {
            name: 'Header',
          },
          relationships: {
            event: {
              data: { type: 'events', id: 1 },
            },
          },
        },
        {
          type: 'images',
          id: 2,
          attributes: {
            name: 'Organiser Johannes',
          },
          relationships: {
            event: {
              data: { type: 'events', id: 1 },
            },
          },
        },
        {
          type: 'images',
          id: 3,
          attributes: {
            name: 'Organiser Martina',
          },
          relationships: {
            event: {
              data: { type: 'events', id: 1 },
            },
          },
        },
      ],
    })

    const event = this.store.find('events', 1)
    expect(event.organisers.length).to.equal(2)
    expect(event.images.length).to.equal(3)
    expect(event.organisers[0].image.id).to.equal(2)
  })

  it('should remove an event', function () {
    this.store.syncAll({
      data: [
        { id: 1, type: 'events' },
        { id: 2, type: 'events' },
      ],
    })

    let event = this.store.find('events', 1)
    expect(event.id).to.eq(1)
    this.store.remove('events', 1)
    event = this.store.find('events', 1)
    expect(event).to.eq(null)
  })

  it('should remove all events', function () {
    this.store.syncAll({
      data: [
        { id: 1, type: 'events' },
        { id: 2, type: 'events' },
      ],
    })

    let events = this.store.findAll('events')
    expect(events.length).to.eq(2)
    this.store.remove('events')
    events = this.store.findAll('events')
    expect(events).to.deep.eq([])
  })

  it('should reset', function () {
    this.store.syncAll({
      data: [
        {
          type: 'events',
          id: 1,
          attributes: {
            name: 'Demo',
          },
          relationships: {
            images: {
              data: [{ type: 'images', id: 2 }],
            },
          },
        },
        {
          type: 'events',
          id: 2,
          attributes: {
            name: 'Demo 2',
          },
        },
      ],
      included: [
        {
          type: 'images',
          id: 2,
          attributes: {
            name: 'Header',
          },
          relationships: {
            event: {
              data: { type: 'events', id: 1 },
            },
          },
        },
      ],
    })

    let events = this.store.findAll('events')
    let images = this.store.findAll('images')
    expect(events.length).to.eq(2)
    expect(images.length).to.eq(1)

    this.store.reset()

    events = this.store.findAll('event')
    images = this.store.findAll('image')
    expect(events).to.deep.eq([])
    expect(images).to.deep.eq([])
  })

  it('should handle circular relations', function () {
    this.store.syncAll({
      data: {
        type: 'events',
        id: 1,
        attributes: {
          name: 'Demo',
        },
        relationships: {
          images: {
            links: {
              self: 'http://example.com/events/1/relationships/images',
            },
          },
        },
      },
    })

    const event = this.store.find('events', 1)

    expect(event.name).to.equal('Demo')
    expect(event.images[REL_LINKS]).to.deep.equal({
      self: 'http://example.com/events/1/relationships/images',
    })
  })

  it('should retain links and meta on models', function () {
    const result = this.store.syncAll({
      data: [
        {
          type: 'events',
          id: 1,
          meta: {
            name: 'second level meta',
            value: 2,
          },
          attributes: {
            name: 'Demo',
            article: {
              name: 'An Article test',
              teaser: 'this is a teaser...',
              body: 'this is an article body',
              meta: {
                author: 'John Doe',
                date: '2017-06-26',
              },
            },
            meta: {
              name: 'attribute nested meta',
              value: 3,
            },
          },
          relationships: {
            comment: {
              links: {
                self: 'http://example.com/events/1/relationships/comment',
                related: 'http://example.com/events/1/comment',
              },
              data: {
                type: 'comment',
                id: 2,
              },
            },
          },
        },
      ],
      included: [
        {
          type: 'comment',
          id: 2,
          attributes: {
            name: 'Comment',
            details: {
              user: 'micha3ldavid',
              body: 'this is a comment...',
            },
          },
          links: {
            self: 'http://example.com/comment/2',
          },
          meta: {
            author: 'John Doe',
            date: '2017-06-26',
          },
        },
      ],
    })

    // Nested meta in attributes is preserved as-is
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any)[0].article.meta).to.deep.equal({
      author: 'John Doe',
      date: '2017-06-26',
    })
    // Model-level meta uses symbol
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any)[0].comment[META]).to.deep.equal({
      author: 'John Doe',
      date: '2017-06-26',
    })
    // Relationship links use symbol
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any)[0].comment[REL_LINKS]).to.deep.equal({
      self: 'http://example.com/events/1/relationships/comment',
      related: 'http://example.com/events/1/comment',
    })
  })

  it('should not mutate the input document', function () {
    const body = {
      data: {
        type: 'events',
        id: '1',
        attributes: { name: 'Demo' },
        relationships: {
          images: {
            data: [{ type: 'images', id: '2' }],
          },
        },
      },
      included: [{ type: 'images', id: '2', attributes: { url: 'pic.jpg' } }],
      meta: { total: 1 },
    }
    const snapshot = JSON.parse(JSON.stringify(body))

    this.store.sync(body)

    expect(body).to.deep.equal(snapshot)
  })

  it('should sync a single resource and return model directly', function () {
    const event = this.store.sync({
      data: {
        type: 'events',
        id: '1',
        attributes: {
          name: 'Demo',
        },
      },
    })

    expect(Array.isArray(event)).to.be.false
    expect(event.id).to.equal('1')
    expect(event.name).to.equal('Demo')
    expect(event[TYPE]).to.equal('events')
  })

  it('should sync array data and return an array', function () {
    const events = this.store.sync({
      data: [
        { type: 'events', id: '1', attributes: { name: 'Event 1' } },
        { type: 'events', id: '2', attributes: { name: 'Event 2' } },
      ],
    })

    expect(Array.isArray(events)).to.be.true
    expect(events.length).to.equal(2)
    expect(events[0].name).to.equal('Event 1')
    expect(events[1].name).to.equal('Event 2')
  })

  it('should preserve META on sync with single resource', function () {
    const event = this.store.sync({
      data: {
        type: 'events',
        id: '1',
        attributes: { name: 'Demo' },
      },
      meta: { total: 1, page: 1 },
    })

    expect(event[META]).to.deep.equal({ total: 1, page: 1 })
  })

  it('should sync a single resource with numeric id and return model directly', function () {
    const event = this.store.sync({
      data: {
        type: 'events',
        id: 1,
        attributes: {
          name: 'Demo',
        },
      },
    })

    expect(Array.isArray(event)).to.be.false
    expect(event.id).to.equal(1)
    expect(event.name).to.equal('Demo')
    expect(event[TYPE]).to.equal('events')
  })

  it('should sync array data with numeric ids and return an array', function () {
    const events = this.store.sync({
      data: [
        { type: 'events', id: 1, attributes: { name: 'Event 1' } },
        { type: 'events', id: 2, attributes: { name: 'Event 2' } },
      ],
    })

    expect(Array.isArray(events)).to.be.true
    expect(events.length).to.equal(2)
    expect(events[0].id).to.equal(1)
    expect(events[0].name).to.equal('Event 1')
    expect(events[1].id).to.equal(2)
    expect(events[1].name).to.equal('Event 2')
  })

  it('should sync and preserve numeric ids through relationships', function () {
    const event = this.store.sync({
      data: {
        type: 'events',
        id: 1,
        attributes: {
          name: 'Demo',
        },
        relationships: {
          images: {
            data: [{ type: 'images', id: 2 }],
          },
        },
      },
      included: [
        {
          type: 'images',
          id: 2,
          attributes: {
            name: 'Header',
          },
        },
      ],
    })

    expect(event.id).to.equal(1)
    expect(event.images[0].id).to.equal(2)
  })

  it('should preserve META on sync with array data', function () {
    const events = this.store.sync({
      data: [
        { type: 'events', id: '1', attributes: { name: 'Event 1' } },
        { type: 'events', id: '2', attributes: { name: 'Event 2' } },
      ],
      meta: { total: 100, page: 1 },
    })

    expect(events[META]).to.deep.equal({ total: 100, page: 1 })
  })

  it('should syncAll always return an array for single resource', function () {
    const result = this.store.syncAll({
      data: {
        type: 'events',
        id: '1',
        attributes: { name: 'Demo' },
      },
    })

    expect(Array.isArray(result)).to.be.true
    expect(result.length).to.equal(1)
    expect(result[0].name).to.equal('Demo')
  })

  it('should preserve document-level meta on syncAll result', function () {
    const result = this.store.syncAll({
      data: [
        { type: 'events', id: '1', attributes: { name: 'Event 1' } },
        { type: 'events', id: '2', attributes: { name: 'Event 2' } },
      ],
      meta: { total: 100, page: 1 },
    })

    expect(result.length).to.equal(2)
    expect(result[META]).to.deep.equal({ total: 100, page: 1 })
  })

  it('should retrieve a single model by type', function () {
    const result = this.store.retrieve('events', {
      data: {
        type: 'events',
        id: '1',
        attributes: { name: 'Demo' },
      },
    })

    expect(result).to.not.be.null
    expect(result.id).to.equal('1')
    expect(result.name).to.equal('Demo')
    expect(result[TYPE]).to.equal('events')
  })

  it('should return null when no model of the given type exists', function () {
    const result = this.store.retrieve('events', {
      data: {
        type: 'images',
        id: '1',
        attributes: { url: 'http://example.com/image.jpg' },
      },
    })

    expect(result).to.be.null
  })

  it('should preserve document-level meta on retrieve result', function () {
    const result = this.store.retrieve('events', {
      data: {
        type: 'events',
        id: '1',
        attributes: { name: 'Demo' },
      },
      meta: { total: 1, page: 1 },
    })

    expect(result).to.not.be.null
    expect(result[META]).to.deep.equal({ total: 1, page: 1 })
  })

  it('should preserve document-level meta on retrieveAll result', function () {
    const result = this.store.retrieveAll('events', {
      data: [
        { type: 'events', id: '1', attributes: { name: 'Event 1' } },
        { type: 'images', id: '2', attributes: { name: 'Image' } },
        { type: 'events', id: '3', attributes: { name: 'Event 2' } },
      ],
      meta: { total: 50, page: 2 },
    })

    expect(result.length).to.equal(2)
    expect(result[META]).to.deep.equal({ total: 50, page: 2 })
  })

  it('should retrieveAll and return only filtered type in order', function () {
    const result = this.store.retrieveAll('events', {
      data: [
        { type: 'events', id: '3', attributes: { name: 'Third' } },
        { type: 'images', id: '5', attributes: { name: 'Image' } },
        { type: 'events', id: '1', attributes: { name: 'First' } },
        { type: 'images', id: '6', attributes: { name: 'Image 2' } },
        { type: 'events', id: '2', attributes: { name: 'Second' } },
      ],
    })

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any).length).to.equal(3)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any)[0].id).to.equal('3')
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any)[0].name).to.equal('Third')
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any)[1].id).to.equal('1')
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any)[1].name).to.equal('First')
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any)[2].id).to.equal('2')
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any)[2].name).to.equal('Second')
  })

  it('should retrieveAll mixed types with includes and filter correctly', function () {
    const result = this.store.retrieveAll('events', {
      data: [
        {
          type: 'events',
          id: '1',
          attributes: { name: 'Event 1' },
          relationships: {
            image: {
              data: { type: 'images', id: '10' },
            },
          },
        },
        { type: 'comments', id: '5', attributes: { text: 'Comment' } },
        {
          type: 'events',
          id: '2',
          attributes: { name: 'Event 2' },
          relationships: {
            image: {
              data: { type: 'images', id: '11' },
            },
          },
        },
      ],
      included: [
        { type: 'images', id: '10', attributes: { name: 'Image 10' } },
        { type: 'images', id: '11', attributes: { name: 'Image 11' } },
      ],
    })

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any).length).to.equal(2)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any)[0].id).to.equal('1')
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any)[0].name).to.equal('Event 1')
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any)[1].id).to.equal('2')
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
    expect((result as any)[1].name).to.equal('Event 2')

    const allImages = this.store.findAll('images')
    expect(allImages.length).to.equal(2)
  })

  describe('Schema Validation', function () {
    it('should validate data with schema in strict mode', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .passthrough()

      const store = new Store({
        schemas: { events: eventSchema },
        strict: true,
      })

      const result = store.syncAll({
        data: {
          type: 'events',
          id: '1',
          attributes: { name: 'Valid Event' },
        },
      })

      expect(result.length).to.equal(1)
      expect(result[0].name).to.equal('Valid Event')
      expect(store.validationErrors.length).to.equal(0)
    })

    it('should not leave store in inconsistent state when strict validation throws', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })
        .passthrough()

      const store = new Store({
        schemas: { events: eventSchema },
        strict: true,
      })

      // Pre-populate store with valid data
      store.syncAll({
        data: {
          type: 'events',
          id: '1',
          attributes: { name: 'Original', requiredField: 'value' },
        },
      })

      expect(store.findAll('events').length).to.equal(1)

      // Sync invalid data that will throw
      expect(() => {
        store.syncAll({
          data: {
            type: 'events',
            id: '2',
            attributes: { name: 'Invalid Event' },
          },
        })
      }).to.throw()

      // Store should have rolled back - the invalid record should not be persisted
      const record = store.findRecord('events', '2')
      expect(record).to.equal(undefined)
    })

    it('should throw error with invalid data in strict mode', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })
        .passthrough()

      const store = new Store({
        schemas: { events: eventSchema },
        strict: true,
      })

      expect(() => {
        store.syncAll({
          data: {
            type: 'events',
            id: '1',
            attributes: { name: 'Invalid Event' },
          },
        })
      }).to.throw()
    })

    it('should collect validation errors in safe mode', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })
        .passthrough()

      const store = new Store({
        schemas: { events: eventSchema },
        strict: false,
      })

      const result = store.syncAll({
        data: {
          type: 'events',
          id: '1',
          attributes: { name: 'Invalid Event' },
        },
      })

      expect(result.length).to.equal(1)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
      expect((result[0] as any).name).to.equal('Invalid Event')
      expect(store.validationErrors.length).to.equal(1)
      expect(store.validationErrors[0].type).to.equal('events')
      expect(store.validationErrors[0].id).to.equal('1')
      expect(store.validationErrors[0].error).to.exist
    })

    it('should validate only specified types', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .passthrough()

      const store = new Store({
        schemas: { events: eventSchema },
        strict: false,
      })

      const result = store.syncAll({
        data: [
          {
            type: 'events',
            id: '1',
            attributes: { name: 'Event' },
          },
          {
            type: 'images',
            id: '2',
            attributes: { url: 'http://example.com/image.jpg' },
          },
        ],
      })

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
      expect((result as any).length).to.equal(2)
      expect(store.validationErrors.length).to.equal(0)
    })

    it('should validate array of items and collect multiple errors', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })
        .passthrough()

      const store = new Store({
        schemas: { events: eventSchema },
        strict: false,
      })

      const result = store.syncAll({
        data: [
          {
            type: 'events',
            id: '1',
            attributes: { name: 'Event 1' },
          },
          {
            type: 'events',
            id: '2',
            attributes: { name: 'Event 2' },
          },
          {
            type: 'events',
            id: '3',
            attributes: { name: 'Event 3' },
          },
        ],
      })

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
      expect((result as any).length).to.equal(3)
      expect(store.validationErrors.length).to.equal(3)
      expect(store.validationErrors[0].id).to.equal('1')
      expect(store.validationErrors[1].id).to.equal('2')
      expect(store.validationErrors[2].id).to.equal('3')
    })

    it('should clear validation errors on each sync', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })
        .passthrough()

      const store = new Store({
        schemas: { events: eventSchema },
        strict: false,
      })

      store.syncAll({
        data: {
          type: 'events',
          id: '1',
          attributes: { name: 'Invalid Event' },
        },
      })

      expect(store.validationErrors.length).to.equal(1)

      store.syncAll({
        data: {
          type: 'events',
          id: '2',
          attributes: { name: 'Valid Event', requiredField: 'value' },
        },
      })

      expect(store.validationErrors.length).to.equal(0)
    })

    it('should work with type-safe retrieveAll and filtered results', function () {
      interface Event {
        id: string
        name: string
      }

      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .passthrough()

      const store = new Store({
        schemas: { events: eventSchema },
        strict: true,
      })

      const result = store.retrieveAll('events', {
        data: [
          {
            type: 'events',
            id: '1',
            attributes: { name: 'Event 1' },
          },
          {
            type: 'images',
            id: '2',
            attributes: { url: 'image.jpg' },
          },
          {
            type: 'events',
            id: '3',
            attributes: { name: 'Event 3' },
          },
        ],
      })

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
      expect((result as any).length).to.equal(2)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
      expect((result as any)[0].name).to.equal('Event 1')
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
      expect((result as any)[1].name).to.equal('Event 3')
    })

    it('should preserve META symbol after schema validation', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .passthrough()

      const store = new Store({
        schemas: { events: eventSchema },
        strict: true,
      })

      const result = store.syncAll({
        data: {
          type: 'events',
          id: '1',
          meta: {
            reactorTicketId: '42',
            total: 100,
          },
          attributes: { name: 'Event' },
        },
      })

      expect(result.length).to.equal(1)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
      expect((result[0] as any)[META]).to.deep.equal({
        reactorTicketId: '42',
        total: 100,
      })
    })

    it('should preserve LINKS symbol after schema validation', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .passthrough()

      const store = new Store({
        schemas: { events: eventSchema },
        strict: true,
      })

      const result = store.syncAll({
        data: {
          type: 'events',
          id: '1',
          links: {
            self: 'http://example.com/events/1',
          },
          attributes: { name: 'Event' },
        },
      })

      expect(result.length).to.equal(1)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
      expect((result[0] as any)[LINKS]).to.deep.equal({
        self: 'http://example.com/events/1',
      })
    })

    it('should preserve REL_LINKS and REL_META on relationships after schema validation', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .passthrough()

      const commentSchema = z
        .object({
          id: z.string(),
          body: z.string(),
        })
        .passthrough()

      const store = new Store({
        schemas: { events: eventSchema, comments: commentSchema },
        strict: true,
      })

      const result = store.syncAll({
        data: {
          type: 'events',
          id: '1',
          attributes: { name: 'Event' },
          relationships: {
            comment: {
              links: {
                self: 'http://example.com/events/1/relationships/comment',
              },
              meta: {
                reactorTicketId: '42',
              },
              data: { type: 'comments', id: '2' },
            },
          },
        },
        included: [
          {
            type: 'comments',
            id: '2',
            attributes: { body: 'Great event' },
            meta: {
              author: 'John Doe',
            },
          },
        ],
      })

      expect(result.length).to.equal(1)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
      const event = result[0] as any
      expect(event.comment[REL_LINKS]).to.deep.equal({
        self: 'http://example.com/events/1/relationships/comment',
      })
      expect(event.comment[REL_META]).to.deep.equal({
        reactorTicketId: '42',
      })
      expect(event.comment[META]).to.deep.equal({
        author: 'John Doe',
      })
    })

    it('should validate with pagination scenario', function () {
      interface Event {
        id: string
        name: string
      }

      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .passthrough()

      const store = new Store({
        schemas: { events: eventSchema },
        strict: true,
      })

      store.syncAll({
        data: [
          { type: 'events', id: '1', attributes: { name: 'Page 1 Event 1' } },
          { type: 'events', id: '2', attributes: { name: 'Page 1 Event 2' } },
        ],
      })

      const page2 = store.retrieveAll('events', {
        data: [
          { type: 'events', id: '3', attributes: { name: 'Page 2 Event 1' } },
          { type: 'events', id: '4', attributes: { name: 'Page 2 Event 2' } },
        ],
      })

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
      expect((page2 as any).length).to.equal(2)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
      expect((page2 as any)[0].name).to.equal('Page 2 Event 1')
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
      expect((page2 as any)[1].name).to.equal('Page 2 Event 2')
      expect(store.validationErrors.length).to.equal(0)
    })
  })

  describe('Prototype pollution', function () {
    afterEach(function () {
      // Clean up in case a regression reintroduces pollution
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- runtime cleanup
      delete (Object.prototype as any).polluted
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- runtime cleanup
      delete (Object.prototype as any).viaIncluded
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- runtime cleanup
      delete (Object.prototype as any).cachePoll
    })

    it('should not pollute Object.prototype via type="__proto__"', function () {
      const store = new Store()
      store.sync({
        data: { type: '__proto__', id: 'polluted', attributes: { hacked: 'YES' } },
      })

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- runtime probe
      expect(({} as any).polluted).to.equal(undefined)
      expect(Object.getOwnPropertyDescriptor(Object.prototype, 'polluted')).to.equal(undefined)
    })

    it('should not pollute Object.prototype via an included resource with type="__proto__"', function () {
      // The included resource is materialized because a relationship references
      // it, so this exercises the real vector (and bypasses any data.type check).
      const store = new Store()
      store.sync({
        data: {
          type: 'events',
          id: '1',
          relationships: { author: { data: { type: '__proto__', id: 'viaIncluded' } } },
        },
        included: [{ type: '__proto__', id: 'viaIncluded', attributes: { hacked: 'YES' } }],
      })

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- runtime probe
      expect(({} as any).viaIncluded).to.equal(undefined)
      expect(Object.getOwnPropertyDescriptor(Object.prototype, 'viaIncluded')).to.equal(undefined)
    })

    it('should not pollute Object.prototype via build() with type="__proto__"', function () {
      Store.build({
        data: { type: '__proto__', id: 'polluted', attributes: { hacked: 'YES' } },
      })

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- runtime probe
      expect(({} as any).polluted).to.equal(undefined)
    })

    it('should not mutate a model prototype via a relationship named "__proto__"', function () {
      const store = new Store()
      const model = store.sync({
        data: { type: 'thing', id: '1', relationships: { ['__proto__']: { data: null } } },
      })

      // The model must keep its normal prototype (not be stripped to null)
      expect(Object.getPrototypeOf(model)).to.equal(Object.prototype)
      // And the global prototype must be untouched
      expect(Object.getPrototypeOf({})).to.equal(Object.prototype)
    })

    it('should reject unsafe relationship member names (__proto__/constructor/prototype)', function () {
      const store = new Store()
      const model = store.sync({
        data: {
          type: 'thing',
          id: '1',
          relationships: {
            ['__proto__']: { data: { type: 'other', id: '2' } },
            constructor: { data: { type: 'other', id: '3' } },
            prototype: { data: { type: 'other', id: '4' } },
            author: { data: { type: 'other', id: '5' } },
          },
        },
        included: [
          { type: 'other', id: '2' },
          { type: 'other', id: '3' },
          { type: 'other', id: '4' },
          { type: 'other', id: '5' },
        ],
      })

      // Unsafe names are dropped (never become own properties of the model)
      expect(Object.prototype.hasOwnProperty.call(model, '__proto__')).to.equal(false)
      expect(Object.prototype.hasOwnProperty.call(model, 'constructor')).to.equal(false)
      expect(Object.prototype.hasOwnProperty.call(model, 'prototype')).to.equal(false)
      // A legitimate relationship is still resolved
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- runtime probe
      expect((model as any).author.id).to.equal('5')
    })

    it('should not pollute via a plain-object cache passed to find()', function () {
      const store = new Store()
      store.sync({ data: { type: '__proto__', id: 'cachePoll', attributes: { hacked: 'YES' } } })
      // A caller-supplied plain {} cache must not let type="__proto__" reach Object.prototype
      store.find('__proto__', 'cachePoll', {})

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- runtime probe
      expect(({} as any).cachePoll).to.equal(undefined)
      expect(Object.getOwnPropertyDescriptor(Object.prototype, 'cachePoll')).to.equal(undefined)
    })
  })
})
