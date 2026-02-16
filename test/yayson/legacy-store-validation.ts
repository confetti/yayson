import { expect } from 'chai'
import { z } from 'zod'
import LegacyStore from '../../src/yayson/legacy-store.js'
import { TYPE, META } from '../../src/utils.js'

describe('LegacyStore', function () {
  describe('Schema Validation', function () {
    describe('Backward Compatibility', function () {
      it('should work without schemas', function () {
        const store = new LegacyStore()

        store.syncAll({ event: { id: '1', name: 'Demo' } })
        const event = store.find('event', '1')

        expect(event).to.not.be.null
        if (event) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data without schema
          expect((event as { name: string }).name).to.equal('Demo')
          expect(store.validationErrors.length).to.equal(0)
        }
      })

      it('should work with type mapping but no schemas', function () {
        const store = new LegacyStore({
          types: {
            events: 'event',
          },
        })

        store.syncAll({ events: [{ id: '1', name: 'Event 1' }] })
        const events = store.findAll('event')

        expect(events.length).to.equal(1)
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data without schema
        expect((events[0] as { name: string }).name).to.equal('Event 1')
        expect(store.validationErrors.length).to.equal(0)
      })
    })

    describe('Strict Mode', function () {
      it('should validate data with schema in strict mode', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
        })

        const store = new LegacyStore({
          schemas: { event: eventSchema },
          strict: true,
        })

        store.syncAll({ event: { id: '1', name: 'Valid Event' } })
        const event = store.find('event', '1')

        expect(event).to.not.be.null
        if (event) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape
          expect((event as { name: string }).name).to.equal('Valid Event')
          expect(store.validationErrors.length).to.equal(0)
        }
      })

      it('should throw error with invalid data in strict mode', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })

        const store = new LegacyStore({
          schemas: { event: eventSchema },
          strict: true,
        })

        // With eager validation, exception is thrown during sync()
        expect(() => {
          store.syncAll({ event: { id: '1', name: 'Invalid Event' } })
        }).to.throw()
      })

      it('should validate with schema transforms in strict mode', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
          count: z.string().transform((val) => parseInt(val, 10)),
        })

        const store = new LegacyStore({
          schemas: { event: eventSchema },
          strict: true,
        })

        store.syncAll({ event: { id: '1', name: 'Event', count: '42' } })
        const event = store.find('event', '1')

        expect(event).to.not.be.null
        if (event) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape after transform
          expect((event as { count: number }).count).to.equal(42)
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape after transform
          expect(typeof (event as { count: number }).count).to.equal('number')
        }
      })
    })

    describe('Safe Mode', function () {
      it('should collect validation errors in safe mode', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })

        const store = new LegacyStore({
          schemas: { event: eventSchema },
          strict: false,
        })

        store.syncAll({ event: { id: '1', name: 'Invalid Event' } })
        const event = store.find('event', '1')

        expect(event).to.not.be.null
        if (event) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
          expect((event as any).name).to.equal('Invalid Event')
        }
        expect(store.validationErrors.length).to.equal(1)
        expect(store.validationErrors[0].type).to.equal('event')
        expect(store.validationErrors[0].id).to.equal('1')
        expect(store.validationErrors[0].error).to.exist
      })

      it('should validate during sync, not during find', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })

        const store = new LegacyStore({
          schemas: { event: eventSchema },
          strict: false,
        })

        store.syncAll({ event: { id: '1', name: 'Invalid Event' } })

        // Validation errors should be collected during sync, not find
        expect(store.validationErrors.length).to.equal(1)
        expect(store.validationErrors[0].type).to.equal('event')
        expect(store.validationErrors[0].id).to.equal('1')
      })

      it('should validate array of items and collect multiple errors', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })

        const store = new LegacyStore({
          schemas: { event: eventSchema },
          strict: false,
        })

        store.syncAll({
          event: [
            { id: '1', name: 'Event 1' },
            { id: '2', name: 'Event 2' },
            { id: '3', name: 'Event 3' },
          ],
        })

        const events = store.findAll('event')
        expect(events.length).to.equal(3)
        expect(store.validationErrors.length).to.equal(3)
        expect(store.validationErrors[0].id).to.equal('1')
        expect(store.validationErrors[1].id).to.equal('2')
        expect(store.validationErrors[2].id).to.equal('3')
      })

      it('should clear validation errors on each sync', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })

        const store = new LegacyStore({
          schemas: { event: eventSchema },
          strict: false,
        })

        store.syncAll({ event: { id: '1', name: 'Invalid Event' } })
        store.find('event', '1')
        expect(store.validationErrors.length).to.equal(1)

        store.syncAll({ event: { id: '2', name: 'Valid Event', requiredField: 'value' } })
        store.find('event', '2')
        expect(store.validationErrors.length).to.equal(0)
      })

      it('should clear validation errors on reset', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })

        const store = new LegacyStore({
          schemas: { event: eventSchema },
          strict: false,
        })

        store.syncAll({ event: { id: '1', name: 'Invalid Event' } })
        store.find('event', '1')
        expect(store.validationErrors.length).to.equal(1)

        store.reset()
        expect(store.validationErrors.length).to.equal(0)
        expect(store.findAll('event').length).to.equal(0)
      })
    })

    describe('Partial Schema Coverage', function () {
      it('should validate only types with schemas', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
        })

        const store = new LegacyStore({
          schemas: { event: eventSchema },
          strict: false,
        })

        store.syncAll({
          event: { id: '1', name: 'Event' },
          image: { id: '2', url: 'http://example.com/image.jpg' },
        })

        const event = store.find('event', '1')
        const image = store.find('image', '2')

        expect(event).to.not.be.null
        expect(image).to.not.be.null
        // Only event should be validated
        expect(store.validationErrors.length).to.equal(0)

        if (image) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data without schema
          expect((image as any).url).to.equal('http://example.com/image.jpg')
        }
      })
    })

    describe('Validation with Relations', function () {
      it('should validate after relations are resolved', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
          images: z.array(
            z.object({
              id: z.string(),
              url: z.string(),
            }),
          ),
        })

        const imageSchema = z.object({
          id: z.string(),
          url: z.string(),
        })

        const store = new LegacyStore({
          schemas: {
            event: eventSchema,
            image: imageSchema,
          },
          strict: true,
        })

        store.syncAll({
          links: {
            'event.images': { type: 'image' },
          },
          event: { id: '1', name: 'Event', images: ['2'] },
          image: [{ id: '2', url: 'http://example.com/image.jpg' }],
        })

        const event = store.find('event', '1')
        expect(event).to.not.be.null
        if (event) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape
          expect((event as { name: string }).name).to.equal('Event')
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape
          expect(Array.isArray((event as any).images)).to.be.true
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape
          expect((event as any).images[0].url).to.equal('http://example.com/image.jpg')
          expect(store.validationErrors.length).to.equal(0)
        }
      })

      it('should handle circular relations with validation', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
          images: z.array(z.any()),
        })

        const imageSchema = z.object({
          id: z.string(),
          url: z.string(),
          event: z.any(),
        })

        const store = new LegacyStore({
          schemas: {
            event: eventSchema,
            image: imageSchema,
          },
          strict: false,
        })

        store.syncAll({
          links: {
            'event.images': { type: 'image' },
            'image.event': { type: 'event' },
          },
          event: { id: '1', name: 'Event', images: ['2'] },
          image: [{ id: '2', url: 'http://example.com/image.jpg', event: '1' }],
        })

        const event = store.find('event', '1')
        expect(event).to.not.be.null
        if (event) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape
          expect((event as { name: string }).name).to.equal('Event')
          expect(store.validationErrors.length).to.equal(0)
        }
      })
    })

    describe('Type Mapping with Schemas', function () {
      it('should validate with type mapping', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
        })

        const store = new LegacyStore({
          types: {
            events: 'event',
          },
          schemas: {
            event: eventSchema,
          },
          strict: true,
        })

        store.syncAll({ events: [{ id: '1', name: 'Event' }] })
        const events = store.findAll('event')

        expect(events.length).to.equal(1)
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape
        expect((events[0] as { name: string }).name).to.equal('Event')
        expect(store.validationErrors.length).to.equal(0)
      })

      it('should validate with multiple type mappings', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
        })

        const imageSchema = z.object({
          id: z.string(),
          url: z.string(),
        })

        const store = new LegacyStore({
          types: {
            events: 'event',
            images: 'image',
          },
          schemas: {
            event: eventSchema,
            image: imageSchema,
          },
          strict: true,
        })

        store.syncAll({
          events: [{ id: '1', name: 'Event' }],
          images: [{ id: '2', url: 'http://example.com/image.jpg' }],
        })

        const events = store.findAll('event')
        const images = store.findAll('image')

        expect(events.length).to.equal(1)
        expect(images.length).to.equal(1)
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape
        expect((events[0] as { name: string }).name).to.equal('Event')
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape
        expect((images[0] as { url: string }).url).to.equal('http://example.com/image.jpg')
        expect(store.validationErrors.length).to.equal(0)
      })
    })

    describe('retrieve() method', function () {
      it('should validate when using retrieve()', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
        })

        const store = new LegacyStore({
          schemas: { event: eventSchema },
          strict: true,
        })

        const event = store.retrieve('event', {
          event: { id: '1', name: 'Event' },
        })

        expect(event).to.not.be.null
        if (event) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape
          expect((event as { name: string }).name).to.equal('Event')
          expect(store.validationErrors.length).to.equal(0)
        }
      })

      it('should attach document-level meta to model via retrieve()', function () {
        const store = new LegacyStore()

        const event = store.retrieve('event', {
          meta: { total: 100, page: 1 },
          event: { id: '1', name: 'Event' },
        })

        expect(event).to.not.be.null
        if (event) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
          expect((event as any)[META]).to.deep.equal({ total: 100, page: 1 })
        }
      })

      it('should validate with retrieve() in safe mode', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })

        const store = new LegacyStore({
          schemas: { event: eventSchema },
          strict: false,
        })

        const event = store.retrieve('event', {
          event: { id: '1', name: 'Event' },
        })

        expect(event).to.not.be.null
        if (event) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
          expect((event as any).name).to.equal('Event')
        }
        expect(store.validationErrors.length).to.equal(1)
        expect(store.validationErrors[0].type).to.equal('event')
        expect(store.validationErrors[0].id).to.equal('1')
      })
    })

    describe('deprecated retrive() method', function () {
      it('should validate when using deprecated retrive()', function () {
        const eventSchema = z.object({
          id: z.string(),
          name: z.string(),
        })

        const store = new LegacyStore({
          schemas: { event: eventSchema },
          strict: true,
        })

        const event = store.retrive('event', {
          event: { id: '1', name: 'Event' },
        })

        expect(event).to.not.be.null
        if (event) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape
          expect((event as { name: string }).name).to.equal('Event')
          expect(store.validationErrors.length).to.equal(0)
        }
      })
    })
  })

  describe('Meta Preservation', function () {
    it('should preserve META symbol after schema validation with passthrough', function () {
      const postSchema = z
        .object({
          id: z.string(),
          title: z.string(),
        })
        .passthrough()

      const store = new LegacyStore({
        schemas: { post: postSchema },
        strict: true,
      })

      store.syncAll({
        post: {
          id: '1',
          title: 'Hello',
          meta: { reactorTicketId: '42', total: 100 },
        },
      })

      const post = store.find('post', '1')
      expect(post).to.not.be.null
      if (post) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
        expect((post as any)[META]).to.deep.equal({
          reactorTicketId: '42',
          total: 100,
        })
      }
    })

    it('should preserve META symbol after schema validation without passthrough', function () {
      const postSchema = z.object({
        id: z.string(),
        title: z.string(),
      })

      const store = new LegacyStore({
        schemas: { post: postSchema },
        strict: true,
      })

      store.syncAll({
        post: {
          id: '1',
          title: 'Hello',
          meta: { reactorTicketId: '42', total: 100 },
        },
      })

      const post = store.find('post', '1')
      expect(post).to.not.be.null
      if (post) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
        expect((post as any)[META]).to.deep.equal({
          reactorTicketId: '42',
          total: 100,
        })
      }
    })

    it('should preserve top-level meta on legacy data', function () {
      const store = new LegacyStore()

      const data = {
        meta: { total: 100, page: 1 },
        post: [
          { id: '1', title: 'First' },
          { id: '2', title: 'Second' },
        ],
      }

      store.syncAll(data)

      // Top-level meta is accessible directly on the data object
      expect(data.meta).to.deep.equal({ total: 100, page: 1 })
    })

    it('should preserve document-level meta on syncAll result', function () {
      const store = new LegacyStore()

      const result = store.syncAll({
        meta: { total: 100, page: 1 },
        post: [
          { id: '1', title: 'First' },
          { id: '2', title: 'Second' },
        ],
      })

      expect(result.length).to.equal(2)
      expect(result[META]).to.deep.equal({ total: 100, page: 1 })
    })

    it('should preserve document-level meta on retrieveAll result', function () {
      const store = new LegacyStore()

      const result = store.retrieveAll('post', {
        meta: { total: 50, page: 2 },
        post: [
          { id: '1', title: 'First' },
          { id: '2', title: 'Second' },
        ],
        image: [{ id: '3', url: 'https://example.com/img.jpg' }],
      })

      expect(result.length).to.equal(2)
      expect(result[META]).to.deep.equal({ total: 50, page: 2 })
    })
  })

  describe('Type Inference', function () {
    it('should infer types from Zod schemas', function () {
      const eventSchema = z.object({
        id: z.string(),
        name: z.string(),
        date: z.string(),
      })

      const imageSchema = z.object({
        id: z.string(),
        url: z.string(),
        width: z.number(),
        height: z.number(),
      })

      const schemas = {
        event: eventSchema,
        image: imageSchema,
      } as const

      const store = new LegacyStore({ schemas, strict: true })

      store.syncAll({
        event: [
          { id: '1', name: 'TypeScript Meetup', date: '2025-01-15' },
          { id: '2', name: 'JavaScript Conf', date: '2025-02-20' },
        ],
        image: [{ id: '3', url: 'https://example.com/image.jpg', width: 800, height: 600 }],
      })

      // TypeScript should infer that events is of type with name and date
      const events = store.findAll('event')
      expect(events.length).to.equal(2)
      expect(events[0].name).to.equal('TypeScript Meetup')
      expect(events[0].date).to.equal('2025-01-15')

      // TypeScript should infer that images is of type with url, width, height
      const images = store.findAll('image')
      expect(images.length).to.equal(1)
      expect(images[0].url).to.equal('https://example.com/image.jpg')
      expect(images[0].width).to.equal(800)
      expect(images[0].height).to.equal(600)

      // find should also work with type inference
      const event = store.find('event', '1')
      expect(event).to.not.be.null
      if (event) {
        expect(event.name).to.equal('TypeScript Meetup')
        expect(event.date).to.equal('2025-01-15')
      }

      const image = store.find('image', '3')
      expect(image).to.not.be.null
      if (image) {
        expect(image.url).to.equal('https://example.com/image.jpg')
        expect(image.width).to.equal(800)
      }
    })

    it('should infer types from custom Zod-like schema', function () {
      class Ticket {
        id!: string
        title!: string
        priority!: number

        constructor(data: { id: string; title?: string; priority?: number }) {
          this.id = data.id
          this.title = data.title || 'Untitled'
          this.priority = data.priority || 0
        }
      }

      // Custom Zod-like schema with parse and safeParse methods
      const ticketSchema = {
        parse: (data: unknown): Ticket =>
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test schema, data validated at runtime
          new Ticket(data as { id: string; title?: string; priority?: number }),
        safeParse: (data: unknown): { success: true; data: Ticket } | { success: false; error: Error } => {
          try {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test schema, data validated at runtime
            const ticket = new Ticket(data as { id: string; title?: string; priority?: number })
            return { success: true, data: ticket }
          } catch (error) {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test schema, error is always Error
            return { success: false, error: error as Error }
          }
        },
      }

      const schemas = { ticket: ticketSchema } as const

      const store = new LegacyStore({ schemas })

      store.syncAll({
        ticket: [
          { id: '1', title: 'Fix bug', priority: 5 },
          { id: '2', title: 'Add feature', priority: 3 },
        ],
      })

      // TypeScript infers Ticket type from parse method return type
      const tickets = store.findAll('ticket')
      expect(tickets.length).to.equal(2)
      expect(tickets[0].title).to.equal('Fix bug')
      expect(tickets[0].priority).to.equal(5)
      expect(tickets[0].id).to.equal('1')

      const ticket = store.find('ticket', '1')
      expect(ticket).to.not.be.null
      if (ticket) {
        expect(ticket.title).to.equal('Fix bug')
        expect(ticket.priority).to.equal(5)
      }
    })

    it('should work with retrieve() and type inference', function () {
      const eventSchema = z.object({
        id: z.string(),
        name: z.string(),
      })

      const schemas = {
        event: eventSchema,
      } as const

      const store = new LegacyStore({ schemas, strict: true })

      const event = store.retrieve('event', {
        event: { id: '1', name: 'Event' },
      })

      expect(event).to.not.be.null
      if (event) {
        expect(event.name).to.equal('Event')
      }
    })

    it('should work without schemas (backward compatibility)', function () {
      const store = new LegacyStore()

      store.syncAll({ event: { id: '1', name: 'Event' } })

      // Without schemas, returns StoreModel
      const events = store.findAll('event')
      expect(events.length).to.equal(1)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data without schema
      expect((events[0] as { name: string }).name).to.equal('Event')
    })
  })

  describe('retrieveAll', function () {
    it('should return filtered results with retrieveAll', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .passthrough()

      const imageSchema = z
        .object({
          id: z.string(),
          url: z.string(),
        })
        .passthrough()

      const schemas = {
        event: eventSchema,
        image: imageSchema,
      } as const

      const store = new LegacyStore({ schemas, strict: true })

      // Sync both types but filter to only events
      const events = store.retrieveAll('event', {
        event: [
          { id: '1', name: 'Event 1' },
          { id: '2', name: 'Event 2' },
        ],
        image: [{ id: '3', url: 'https://example.com/img.jpg' }],
      })

      expect(Array.isArray(events)).to.be.true
      if (Array.isArray(events)) {
        expect(events.length).to.equal(2)
        expect(events[0].name).to.equal('Event 1')
        expect(events[1].name).to.equal('Event 2')
      }
    })

    it('should return array even when retrieveAll matches one item', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .passthrough()

      const schemas = { event: eventSchema } as const

      const store = new LegacyStore({ schemas, strict: true })

      const events = store.retrieveAll('event', {
        event: { id: '1', name: 'Single Event' },
      })

      expect(Array.isArray(events)).to.be.true
      expect(events.length).to.equal(1)
      expect(events[0].name).to.equal('Single Event')
      expect(events[0].id).to.equal('1')
    })

    it('should return empty array when retrieveAll matches nothing', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .passthrough()

      const schemas = { event: eventSchema } as const

      const store = new LegacyStore({ schemas, strict: true })

      const events = store.retrieveAll('event', {
        image: { id: '1', url: 'https://example.com/img.jpg' },
      })

      expect(Array.isArray(events)).to.be.true
      if (Array.isArray(events)) {
        expect(events.length).to.equal(0)
      }
    })

    it('should work with type mapping and retrieveAll', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .passthrough()

      const schemas = { event: eventSchema } as const

      const store = new LegacyStore({
        types: { events: 'event' },
        schemas,
        strict: true,
      })

      // Use plural name in data, singular in retrieveAll type
      const events = store.retrieveAll('event', {
        events: [
          { id: '1', name: 'Event 1' },
          { id: '2', name: 'Event 2' },
        ],
      })

      expect(Array.isArray(events)).to.be.true
      if (Array.isArray(events)) {
        expect(events.length).to.equal(2)
        expect(events[0].name).to.equal('Event 1')
      }
    })

    it('should return all synced models from syncAll()', function () {
      const store = new LegacyStore()

      const result = store.syncAll({
        event: [
          { id: '1', name: 'Event 1' },
          { id: '2', name: 'Event 2' },
        ],
        image: { id: '3', url: 'https://example.com/img.jpg' },
      })

      expect(Array.isArray(result)).to.be.true
      if (Array.isArray(result)) {
        expect(result.length).to.equal(3)
      }
    })

    it('should infer correct types with retrieveAll', function () {
      const eventSchema = z.object({
        id: z.string(),
        name: z.string(),
        date: z.string(),
      })

      const imageSchema = z.object({
        id: z.string(),
        url: z.string(),
        width: z.number(),
      })

      const schemas = {
        event: eventSchema,
        image: imageSchema,
      } as const

      const store = new LegacyStore({ schemas, strict: true })

      // TypeScript should infer correct type from retrieveAll type parameter
      const events = store.retrieveAll('event', {
        event: [{ id: '1', name: 'Conference', date: '2025-06-01' }],
        image: [{ id: '2', url: 'https://example.com/img.jpg', width: 800 }],
      })

      expect(Array.isArray(events)).to.be.true
      if (Array.isArray(events)) {
        expect(events.length).to.equal(1)
        // Type inference should allow accessing .name and .date
        expect(events[0].name).to.equal('Conference')
        expect(events[0].date).to.equal('2025-06-01')
      }

      // RetrieveAll images
      const images = store.retrieveAll('image', {
        event: [{ id: '1', name: 'Conference', date: '2025-06-01' }],
        image: [{ id: '2', url: 'https://example.com/img.jpg', width: 800 }],
      })

      expect(Array.isArray(images)).to.be.true
      if (Array.isArray(images)) {
        expect(images.length).to.equal(1)
        // Type inference should allow accessing .url and .width
        expect(images[0].url).to.equal('https://example.com/img.jpg')
        expect(images[0].width).to.equal(800)
      }
    })
  })

  describe('TYPE symbol', function () {
    it('should set TYPE symbol on models', function () {
      const store = new LegacyStore()

      store.syncAll({ event: { id: '1', name: 'Demo' } })
      const event = store.find('event', '1')

      expect(event).to.not.be.null
      if (event) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
        expect((event as any)[TYPE]).to.equal('event')
      }
    })

    it('should set TYPE symbol with type mapping', function () {
      const store = new LegacyStore({
        types: { events: 'event' },
      })

      store.syncAll({ events: [{ id: '1', name: 'Event 1' }] })
      const events = store.findAll('event')

      expect(events.length).to.equal(1)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
      expect((events[0] as any)[TYPE]).to.equal('event')
    })

    it('should preserve TYPE symbol after schema validation', function () {
      const eventSchema = z.object({
        id: z.string(),
        name: z.string(),
      })

      const store = new LegacyStore({
        schemas: { event: eventSchema },
        strict: true,
      })

      store.syncAll({ event: { id: '1', name: 'Demo' } })
      const event = store.find('event', '1')

      expect(event).to.not.be.null
      if (event) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test needs runtime property access
        expect((event as any)[TYPE]).to.equal('event')
      }
    })
  })
})
