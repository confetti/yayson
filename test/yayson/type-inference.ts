import { expect } from 'chai'
import { z } from 'zod'
import { createStore } from '../../src/yayson.js'

describe('Type Inference', function () {
  it('should infer types from Zod schemas', function () {
    const eventSchema = z.object({
      id: z.string(),
      type: z.literal('events'),
      name: z.string(),
      date: z.string(),
    })

    const imageSchema = z.object({
      id: z.string(),
      type: z.literal('images'),
      url: z.string(),
      width: z.number(),
      height: z.number(),
    })

    const schemas = {
      events: eventSchema,
      images: imageSchema,
    } as const

    const Store = createStore({ schemas, strict: true })
    const store = new Store()

    store.sync({
      data: [
        {
          type: 'events',
          id: '1',
          attributes: {
            name: 'TypeScript Meetup',
            date: '2025-01-15',
          },
        },
        {
          type: 'images',
          id: '2',
          attributes: {
            url: 'https://example.com/image.jpg',
            width: 800,
            height: 600,
          },
        },
      ],
    })

    // TypeScript should infer that events is of type with name and date
    const events = store.findAll('events')
    expect(events.length).to.equal(1)
    expect(events[0].name).to.equal('TypeScript Meetup')
    expect(events[0].date).to.equal('2025-01-15')

    // TypeScript should infer that images is of type with url, width, height
    const images = store.findAll('images')
    expect(images.length).to.equal(1)
    expect(images[0].url).to.equal('https://example.com/image.jpg')
    expect(images[0].width).to.equal(800)
    expect(images[0].height).to.equal(600)

    // find should also work with type inference
    const event = store.find('events', '1')
    expect(event).to.not.be.null
    if (event) {
      expect(event.name).to.equal('TypeScript Meetup')
      expect(event.date).to.equal('2025-01-15')
    }

    const image = store.find('images', '2')
    expect(image).to.not.be.null
    if (image) {
      expect(image.url).to.equal('https://example.com/image.jpg')
      expect(image.width).to.equal(800)
    }
  })

  it('should infer types from custom schema functions', function () {
    class Ticket {
      id!: string
      type!: string
      title!: string
      priority!: number

      constructor(data: { id: string; type: string; title?: string; priority?: number }) {
        this.id = data.id
        this.type = data.type
        this.title = data.title || 'Untitled'
        this.priority = data.priority || 0
      }
    }

    // Custom schema adapter for function-based schemas
    class FunctionSchemaAdapter {
      static validate(schema: unknown, data: unknown, strict: boolean) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test adapter for function-based schemas
        const fn = schema as unknown as (data: unknown) => unknown
        try {
          const result = fn(data)
          return {
            valid: true,
            data: result,
          }
        } catch (error) {
          if (strict) {
            throw error
          }
          return {
            valid: false,
            data,
            error,
          }
        }
      }

      validate(schema: unknown, data: unknown, strict: boolean) {
        return FunctionSchemaAdapter.validate(schema, data, strict)
      }
    }

    const schemas = {
      tickets: (data: unknown) =>
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test schema function, data validated at runtime
        new Ticket(data as unknown as { id: string; type: string; title?: string; priority?: number }),
    } as const

    const Store = createStore({ schemas, schemaAdapter: FunctionSchemaAdapter })
    const store = new Store()

    store.sync({
      data: {
        type: 'tickets',
        id: '1',
        attributes: {
          title: 'Fix bug',
          priority: 5,
        },
      },
    })

    // TypeScript should infer Ticket type
    const tickets = store.findAll('tickets')
    expect(tickets.length).to.equal(1)
    // Check properties instead of instanceof since the transformed object should have the right shape
    expect(tickets[0].title).to.equal('Fix bug')
    expect(tickets[0].priority).to.equal(5)
    expect(tickets[0].id).to.equal('1')
    expect(tickets[0].type).to.equal('tickets')

    const ticket = store.find('tickets', '1')
    expect(ticket).to.not.be.null
    if (ticket) {
      expect(ticket.title).to.equal('Fix bug')
      expect(ticket.priority).to.equal(5)
    }
  })

  it('should infer types with sync filterType', function () {
    const eventSchema = z.object({
      id: z.string(),
      type: z.literal('events'),
      name: z.string(),
    })

    const commentSchema = z.object({
      id: z.string(),
      type: z.literal('comments'),
      text: z.string(),
    })

    const schemas = {
      events: eventSchema,
      comments: commentSchema,
    } as const

    const Store = createStore({ schemas, strict: true })
    const store = new Store()

    // TypeScript should infer the correct type from filterType
    const events = store.sync(
      {
        data: [
          {
            type: 'events',
            id: '1',
            attributes: { name: 'Event 1' },
          },
          {
            type: 'comments',
            id: '2',
            attributes: { text: 'Comment 1' },
          },
        ],
      },
      'events',
    )

    expect(Array.isArray(events)).to.be.true
    if (Array.isArray(events)) {
      expect(events.length).to.equal(1)
      expect(events[0].name).to.equal('Event 1')
    }
  })

  it('should work without schemas (backward compatibility)', function () {
    const Store = createStore()
    const store = new Store()

    store.sync({
      data: {
        type: 'events',
        id: '1',
        attributes: {
          name: 'Event',
        },
      },
    })

    // Without schemas, returns StoreModel
    const events = store.findAll('events')
    expect(events.length).to.equal(1)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data without schema
    expect((events[0] as { name: string }).name).to.equal('Event')
  })
})
