import { expect } from 'chai'

const { Store } = yayson()

describe('Store', function () {
  beforeEach(function () {
    this.store = new Store()

    this.store.records = []
    this.store.relations = {}
  })

  it('should sync an event', function () {
    const event = this.store.sync({
      data: {
        type: 'events',
        id: 1,
        attributes: {
          name: 'Demo',
        },
      },
    })

    expect(event.name).to.equal('Demo')
  })

  it('should allow an attribute namned type', function () {
    this.store.sync({
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
    this.store.sync({
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
    expect(event.type).to.equal('events')
    expect(event.name).to.equal('Demo')
  })

  it('should handle relations with duplicates', function () {
    this.store.sync({
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

  it('should handle relationship elements without links attribute', function () {
    this.store.sync({
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
    expect(event.image).to.be.null
  })

  it('should handle more circular relations', function () {
    this.store.sync({
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
    expect(event.name).to.equal('Demo')
    expect(event.images[0].name).to.equal('Header')
    expect(event.images[0].event.id).to.equal(1)
  })

  it('should return a event with all associated objects', function () {
    this.store.sync({
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
    this.store.sync({
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
    this.store.sync({
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
    this.store.sync({
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
    this.store.sync({
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
    expect(event.images._links).to.deep.equal({
      self: 'http://example.com/events/1/relationships/images',
    })
  })

  it('should retain links and meta', function () {
    const result = this.store.sync({
      links: {
        self: 'http://example.com/events',
        next: 'http://example.com/events?page[offset]=2',
      },
      meta: {
        name: 'top level meta data',
        value: 1,
      },
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

    expect(result.meta).to.deep.equal({ name: 'top level meta data', value: 1 })
    expect(result[0].article.meta).to.deep.equal({
      author: 'John Doe',
      date: '2017-06-26',
    })
    expect(result[0].comment.meta).to.deep.equal({
      author: 'John Doe',
      date: '2017-06-26',
    })
    expect(result[0].comment._links).to.deep.equal({
      self: 'http://example.com/events/1/relationships/comment',
      related: 'http://example.com/events/1/comment',
    })
  })

  it('should preserve order with findAllOrdered', function () {
    this.store.sync({
      data: [
        { type: 'events', id: '3', attributes: { name: 'Third' } },
        { type: 'events', id: '1', attributes: { name: 'First' } },
        { type: 'events', id: '2', attributes: { name: 'Second' } },
      ],
    })

    const events = this.store.findAllOrdered('events')
    expect(events.length).to.equal(3)
    expect(events[0].id).to.equal('3')
    expect(events[0].name).to.equal('Third')
    expect(events[1].id).to.equal('1')
    expect(events[1].name).to.equal('First')
    expect(events[2].id).to.equal('2')
    expect(events[2].name).to.equal('Second')
  })

  it('should preserve order across multiple syncs with findAllOrdered', function () {
    this.store.sync({
      data: [
        { type: 'events', id: '3', attributes: { name: 'Third' } },
        { type: 'events', id: '1', attributes: { name: 'First' } },
      ],
    })

    this.store.sync({
      data: { type: 'events', id: '2', attributes: { name: 'Second' } },
    })

    const events = this.store.findAllOrdered('events')
    expect(events.length).to.equal(3)
    expect(events[0].id).to.equal('3')
    expect(events[1].id).to.equal('1')
    expect(events[2].id).to.equal('2')
  })

  it('should update order when same id is synced again with findAllOrdered', function () {
    this.store.sync({
      data: [
        { type: 'events', id: '1', attributes: { name: 'First' } },
        { type: 'events', id: '2', attributes: { name: 'Second' } },
      ],
    })

    this.store.sync({
      data: { type: 'events', id: '1', attributes: { name: 'First Updated' } },
    })

    const events = this.store.findAllOrdered('events')
    expect(events.length).to.equal(2)
    expect(events[0].id).to.equal('2')
    expect(events[0].name).to.equal('Second')
    expect(events[1].id).to.equal('1')
    expect(events[1].name).to.equal('First Updated')
  })

  it('should sync and return only filtered type in order', function () {
    const result = this.store.sync(
      {
        data: [
          { type: 'events', id: '3', attributes: { name: 'Third' } },
          { type: 'images', id: '5', attributes: { name: 'Image' } },
          { type: 'events', id: '1', attributes: { name: 'First' } },
          { type: 'images', id: '6', attributes: { name: 'Image 2' } },
          { type: 'events', id: '2', attributes: { name: 'Second' } },
        ],
      },
      'events',
    )

    expect(result.length).to.equal(3)
    expect(result[0].id).to.equal('3')
    expect(result[0].name).to.equal('Third')
    expect(result[1].id).to.equal('1')
    expect(result[1].name).to.equal('First')
    expect(result[2].id).to.equal('2')
    expect(result[2].name).to.equal('Second')
  })

  it('should handle pagination scenario with filtered sync', function () {
    this.store.sync({
      data: [
        { type: 'events', id: '1', attributes: { name: 'Page 1 Event 1' } },
        { type: 'events', id: '2', attributes: { name: 'Page 1 Event 2' } },
      ],
    })

    const page2 = this.store.sync(
      {
        data: [
          { type: 'events', id: '3', attributes: { name: 'Page 2 Event 1' } },
          { type: 'events', id: '4', attributes: { name: 'Page 2 Event 2' } },
        ],
      },
      'events',
    )

    expect(page2.length).to.equal(2)
    expect(page2[0].id).to.equal('3')
    expect(page2[0].name).to.equal('Page 2 Event 1')
    expect(page2[1].id).to.equal('4')
    expect(page2[1].name).to.equal('Page 2 Event 2')

    const allEvents = this.store.findAllOrdered('events')
    expect(allEvents.length).to.equal(4)
  })

  it('should sync mixed types with includes and filter correctly', function () {
    const result = this.store.sync(
      {
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
      },
      'events',
    )

    expect(result.length).to.equal(2)
    expect(result[0].id).to.equal('1')
    expect(result[0].name).to.equal('Event 1')
    expect(result[1].id).to.equal('2')
    expect(result[1].name).to.equal('Event 2')

    const allImages = this.store.findAll('images')
    expect(allImages.length).to.equal(2)
  })
})
