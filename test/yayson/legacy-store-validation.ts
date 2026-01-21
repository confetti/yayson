import { expect } from 'chai'
import { z } from 'zod'
import { createLegacyStore } from '../../src/yayson.js'
import type { ValidationResult } from '../../src/yayson/types.js'

describe('LegacyStore', function () {
  describe('Schema Validation', function () {
    describe('Backward Compatibility', function () {
      it('should work without schemas', function () {
        const Store = createLegacyStore()
        const store = new Store()

        store.sync({ event: { id: '1', name: 'Demo' } })
        const event = store.find('event', '1')

        expect(event).to.not.be.null
        if (event) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data without schema
          expect((event as { name: string }).name).to.equal('Demo')
          expect(store.validationErrors.length).to.equal(0)
        }
      })

      it('should work with type mapping but no schemas', function () {
        const Store = createLegacyStore({
          types: {
            events: 'event',
          },
        })
        const store = new Store()

        store.sync({ events: [{ id: '1', name: 'Event 1' }] })
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
          type: z.string(),
          name: z.string(),
        })

        const Store = createLegacyStore({
          schemas: { event: eventSchema },
          strict: true,
        })
        const store = new Store()

        store.sync({ event: { id: '1', name: 'Valid Event' } })
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
          type: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })

        const Store = createLegacyStore({
          schemas: { event: eventSchema },
          strict: true,
        })
        const store = new Store()

        // With eager validation, exception is thrown during sync()
        expect(() => {
          store.sync({ event: { id: '1', name: 'Invalid Event' } })
        }).to.throw()
      })

      it('should validate with schema transforms in strict mode', function () {
        const eventSchema = z.object({
          id: z.string(),
          type: z.string(),
          name: z.string(),
          count: z.string().transform((val) => parseInt(val, 10)),
        })

        const Store = createLegacyStore({
          schemas: { event: eventSchema },
          strict: true,
        })
        const store = new Store()

        store.sync({ event: { id: '1', name: 'Event', count: '42' } })
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
          type: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })

        const Store = createLegacyStore({
          schemas: { event: eventSchema },
          strict: false,
        })
        const store = new Store()

        store.sync({ event: { id: '1', name: 'Invalid Event' } })
        const event = store.find('event', '1')

        expect(event).to.not.be.null
        if (event) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- Test needs runtime property access
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
          type: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })

        const Store = createLegacyStore({
          schemas: { event: eventSchema },
          strict: false,
        })
        const store = new Store()

        store.sync({ event: { id: '1', name: 'Invalid Event' } })

        // Validation errors should be collected during sync, not find
        expect(store.validationErrors.length).to.equal(1)
        expect(store.validationErrors[0].type).to.equal('event')
        expect(store.validationErrors[0].id).to.equal('1')
      })

      it('should validate array of items and collect multiple errors', function () {
        const eventSchema = z.object({
          id: z.string(),
          type: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })

        const Store = createLegacyStore({
          schemas: { event: eventSchema },
          strict: false,
        })
        const store = new Store()

        store.sync({
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
          type: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })

        const Store = createLegacyStore({
          schemas: { event: eventSchema },
          strict: false,
        })
        const store = new Store()

        store.sync({ event: { id: '1', name: 'Invalid Event' } })
        store.find('event', '1')
        expect(store.validationErrors.length).to.equal(1)

        store.sync({ event: { id: '2', name: 'Valid Event', requiredField: 'value' } })
        store.find('event', '2')
        expect(store.validationErrors.length).to.equal(0)
      })

      it('should clear validation errors on reset', function () {
        const eventSchema = z.object({
          id: z.string(),
          type: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })

        const Store = createLegacyStore({
          schemas: { event: eventSchema },
          strict: false,
        })
        const store = new Store()

        store.sync({ event: { id: '1', name: 'Invalid Event' } })
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
          type: z.string(),
          name: z.string(),
        })

        const Store = createLegacyStore({
          schemas: { event: eventSchema },
          strict: false,
        })
        const store = new Store()

        store.sync({
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
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- Test validates runtime data without schema
          expect((image as any).url).to.equal('http://example.com/image.jpg')
        }
      })
    })

    describe('Validation with Relations', function () {
      it('should validate after relations are resolved', function () {
        const eventSchema = z.object({
          id: z.string(),
          type: z.string(),
          name: z.string(),
          images: z.array(
            z.object({
              id: z.string(),
              type: z.string(),
              url: z.string(),
            }),
          ),
        })

        const imageSchema = z.object({
          id: z.string(),
          type: z.string(),
          url: z.string(),
        })

        const Store = createLegacyStore({
          schemas: {
            event: eventSchema,
            image: imageSchema,
          },
          strict: true,
        })
        const store = new Store()

        store.sync({
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
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- Test validates runtime data shape
          expect(Array.isArray((event as any).images)).to.be.true
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- Test validates runtime data shape
          expect((event as any).images[0].url).to.equal('http://example.com/image.jpg')
          expect(store.validationErrors.length).to.equal(0)
        }
      })

      it('should handle circular relations with validation', function () {
        const eventSchema = z.object({
          id: z.string(),
          type: z.string(),
          name: z.string(),
          images: z.array(z.any()),
        })

        const imageSchema = z.object({
          id: z.string(),
          type: z.string(),
          url: z.string(),
          event: z.any(),
        })

        const Store = createLegacyStore({
          schemas: {
            event: eventSchema,
            image: imageSchema,
          },
          strict: false,
        })
        const store = new Store()

        store.sync({
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
          type: z.string(),
          name: z.string(),
        })

        const Store = createLegacyStore({
          types: {
            events: 'event',
          },
          schemas: {
            event: eventSchema,
          },
          strict: true,
        })
        const store = new Store()

        store.sync({ events: [{ id: '1', name: 'Event' }] })
        const events = store.findAll('event')

        expect(events.length).to.equal(1)
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape
        expect((events[0] as { name: string }).name).to.equal('Event')
        expect(store.validationErrors.length).to.equal(0)
      })

      it('should validate with multiple type mappings', function () {
        const eventSchema = z.object({
          id: z.string(),
          type: z.string(),
          name: z.string(),
        })

        const imageSchema = z.object({
          id: z.string(),
          type: z.string(),
          url: z.string(),
        })

        const Store = createLegacyStore({
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
        const store = new Store()

        store.sync({
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

    describe('Custom Schema Adapter', function () {
      it('should work with custom schema adapter', function () {
        // Custom schema adapter that validates based on custom rules
        class CustomSchemaAdapter {
          static validate(schema: unknown, data: unknown, strict: boolean): ValidationResult {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test adapter, schema is known to have requiredFields
            const customSchema = schema as unknown as { requiredFields: string[] }
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test adapter, data is known to be a record
            const model = data as unknown as Record<string, unknown>

            // Check if all required fields are present
            const missingFields = customSchema.requiredFields.filter((field) => !(field in model))

            if (missingFields.length > 0) {
              if (strict) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
              }
              return {
                valid: false,
                data,
                error: { message: `Missing required fields: ${missingFields.join(', ')}` },
              }
            }

            return {
              valid: true,
              data,
            }
          }

          validate(schema: unknown, data: unknown, strict: boolean): ValidationResult {
            return CustomSchemaAdapter.validate(schema, data, strict)
          }
        }

        const Store = createLegacyStore({
          schemas: {
            event: { requiredFields: ['id', 'type', 'name'] },
          },
          schemaAdapter: CustomSchemaAdapter,
          strict: false,
        })
        const store = new Store()

        store.sync({ event: { id: '1', name: 'Valid Event' } })
        const event = store.find('event', '1')

        expect(event).to.not.be.null
        if (event) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- Test needs runtime property access
          expect((event as any).name).to.equal('Valid Event')
        }
        expect(store.validationErrors.length).to.equal(0)

        // Sync invalid data
        store.sync({ event: { id: '2' } })
        store.find('event', '2')

        expect(store.validationErrors.length).to.equal(1)
        expect(store.validationErrors[0].type).to.equal('event')
        expect(store.validationErrors[0].id).to.equal('2')
      })
    })

    describe('retrieve() method', function () {
      it('should validate when using retrieve()', function () {
        const eventSchema = z.object({
          id: z.string(),
          type: z.string(),
          name: z.string(),
        })

        const Store = createLegacyStore({
          schemas: { event: eventSchema },
          strict: true,
        })
        const store = new Store()

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

      it('should validate with retrieve() in safe mode', function () {
        const eventSchema = z.object({
          id: z.string(),
          type: z.string(),
          name: z.string(),
          requiredField: z.string(),
        })

        const Store = createLegacyStore({
          schemas: { event: eventSchema },
          strict: false,
        })
        const store = new Store()

        const event = store.retrieve('event', {
          event: { id: '1', name: 'Event' },
        })

        expect(event).to.not.be.null
        if (event) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- Test needs runtime property access
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
          type: z.string(),
          name: z.string(),
        })

        const Store = createLegacyStore({
          schemas: { event: eventSchema },
          strict: true,
        })
        const store = new Store()

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

  describe('Type Inference', function () {
    it('should infer types from Zod schemas', function () {
      const eventSchema = z.object({
        id: z.string(),
        type: z.literal('event'),
        name: z.string(),
        date: z.string(),
      })

      const imageSchema = z.object({
        id: z.string(),
        type: z.literal('image'),
        url: z.string(),
        width: z.number(),
        height: z.number(),
      })

      const schemas = {
        event: eventSchema,
        image: imageSchema,
      } as const

      const Store = createLegacyStore({ schemas, strict: true })
      const store = new Store()

      store.sync({
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
        ticket: (data: unknown) =>
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test schema function, data validated at runtime
          new Ticket(data as unknown as { id: string; type: string; title?: string; priority?: number }),
      } as const

      const Store = createLegacyStore({ schemas, schemaAdapter: FunctionSchemaAdapter })
      const store = new Store()

      store.sync({
        ticket: [
          { id: '1', title: 'Fix bug', priority: 5 },
          { id: '2', title: 'Add feature', priority: 3 },
        ],
      })

      // TypeScript should infer Ticket type
      const tickets = store.findAll('ticket')
      expect(tickets.length).to.equal(2)
      // Check properties instead of instanceof since the transformed object should have the right shape
      expect(tickets[0].title).to.equal('Fix bug')
      expect(tickets[0].priority).to.equal(5)
      expect(tickets[0].id).to.equal('1')
      expect(tickets[0].type).to.equal('ticket')

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
        type: z.literal('event'),
        name: z.string(),
      })

      const schemas = {
        event: eventSchema,
      } as const

      const Store = createLegacyStore({ schemas, strict: true })
      const store = new Store()

      const event = store.retrieve('event', {
        event: { id: '1', name: 'Event' },
      })

      expect(event).to.not.be.null
      if (event) {
        expect(event.name).to.equal('Event')
        expect(event.type).to.equal('event')
      }
    })

    it('should work without schemas (backward compatibility)', function () {
      const Store = createLegacyStore()
      const store = new Store()

      store.sync({ event: { id: '1', name: 'Event' } })

      // Without schemas, returns StoreModel
      const events = store.findAll('event')
      expect(events.length).to.equal(1)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data without schema
      expect((events[0] as { name: string }).name).to.equal('Event')
    })
  })
})
