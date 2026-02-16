import { expect } from 'chai'
import { z } from 'zod'
import yayson from '../../src/yayson.js'
import type { ZodLikeSchema } from '../../src/yayson.js'

const { Store, Presenter } = yayson()

describe('Type Inference', function () {
  it('should infer types from Zod schemas', function () {
    const eventSchema = z
      .object({
        id: z.string(),
        name: z.string(),
        date: z.string(),
      })
      .passthrough()

    const imageSchema = z
      .object({
        id: z.string(),
        url: z.string(),
        width: z.number(),
        height: z.number(),
      })
      .passthrough()

    const schemas = {
      events: eventSchema,
      images: imageSchema,
    } as const

    const store = new Store({ schemas, strict: true })

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

    const schemas = { tickets: ticketSchema } as const

    const store = new Store({ schemas })

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

    // TypeScript infers Ticket type from parse method return type
    const tickets = store.findAll('tickets')
    expect(tickets.length).to.equal(1)
    expect(tickets[0].title).to.equal('Fix bug')
    expect(tickets[0].priority).to.equal(5)
    expect(tickets[0].id).to.equal('1')

    const ticket = store.find('tickets', '1')
    expect(ticket).to.not.be.null
    if (ticket) {
      expect(ticket.title).to.equal('Fix bug')
      expect(ticket.priority).to.equal(5)
    }
  })

  it('should infer types with retrieveAll', function () {
    const eventSchema = z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .passthrough()

    const commentSchema = z
      .object({
        id: z.string(),
        text: z.string(),
      })
      .passthrough()

    const schemas = {
      events: eventSchema,
      comments: commentSchema,
    } as const

    const store = new Store({ schemas, strict: true })

    // TypeScript should infer the correct type from retrieveAll type parameter
    const events = store.retrieveAll('events', {
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
    })

    expect(Array.isArray(events)).to.be.true
    if (Array.isArray(events)) {
      expect(events.length).to.equal(1)
      expect(events[0].name).to.equal('Event 1')
    }
  })

  it('should work without schemas (backward compatibility)', function () {
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

  describe('Relationship Type Inference', function () {
    it('should infer types for array relationships', function () {
      const imageSchema = z.object({
        id: z.string(),
        url: z.string(),
        width: z.number().optional(),
      })

      const eventSchema = z.object({
        id: z.string(),
        name: z.string(),
        images: z.array(imageSchema).optional(),
      })

      const schemas = {
        events: eventSchema,
        images: imageSchema,
      } as const

      const store = new Store({ schemas, strict: true })

      store.sync({
        data: {
          type: 'events',
          id: '1',
          attributes: { name: 'Conference' },
          relationships: {
            images: {
              data: [
                { type: 'images', id: '10' },
                { type: 'images', id: '11' },
              ],
            },
          },
        },
        included: [
          {
            type: 'images',
            id: '10',
            attributes: { url: 'https://example.com/a.jpg', width: 800 },
          },
          {
            type: 'images',
            id: '11',
            attributes: { url: 'https://example.com/b.jpg', width: 1200 },
          },
        ],
      })

      const event = store.find('events', '1')
      expect(event).to.not.be.null
      if (event) {
        expect(event.name).to.equal('Conference')
        // TypeScript infers event.images as { id: string; url: string; width?: number }[] | undefined
        expect(event.images).to.be.an('array')
        expect(event.images).to.have.length(2)
        if (event.images) {
          expect(event.images[0].url).to.equal('https://example.com/a.jpg')
          expect(event.images[0].width).to.equal(800)
          expect(event.images[1].url).to.equal('https://example.com/b.jpg')
        }
      }
    })

    it('should infer types for single relationships', function () {
      const authorSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().optional(),
      })

      const articleSchema = z.object({
        id: z.string(),
        title: z.string(),
        author: authorSchema.optional(),
      })

      const schemas = {
        articles: articleSchema,
        authors: authorSchema,
      } as const

      const store = new Store({ schemas, strict: true })

      store.sync({
        data: {
          type: 'articles',
          id: '1',
          attributes: { title: 'TypeScript Tips' },
          relationships: {
            author: {
              data: { type: 'authors', id: '5' },
            },
          },
        },
        included: [
          {
            type: 'authors',
            id: '5',
            attributes: { name: 'Jane Doe', email: 'jane@example.com' },
          },
        ],
      })

      const article = store.find('articles', '1')
      expect(article).to.not.be.null
      if (article) {
        expect(article.title).to.equal('TypeScript Tips')
        // TypeScript infers article.author as { id: string; name: string; email?: string } | undefined
        expect(article.author).to.not.be.undefined
        if (article.author) {
          expect(article.author.name).to.equal('Jane Doe')
          expect(article.author.email).to.equal('jane@example.com')
        }
      }
    })

    it('should handle nullable relationships', function () {
      const authorSchema = z.object({
        id: z.string(),
        name: z.string(),
      })

      const articleSchema = z.object({
        id: z.string(),
        title: z.string(),
        author: authorSchema.nullable(),
      })

      const schemas = {
        articles: articleSchema,
        authors: authorSchema,
      } as const

      const store = new Store({ schemas, strict: true })

      // Article with null author relationship
      store.sync({
        data: {
          type: 'articles',
          id: '1',
          attributes: { title: 'Anonymous Post' },
          relationships: {
            author: {
              data: null,
            },
          },
        },
      })

      const article = store.find('articles', '1')
      expect(article).to.not.be.null
      if (article) {
        expect(article.title).to.equal('Anonymous Post')
        // TypeScript infers article.author as { id: string; name: string } | null
        expect(article.author).to.be.null
      }
    })

    it('should handle unresolved relationships (referenced but not included)', function () {
      const imageSchema = z.object({
        id: z.string(),
        url: z.string(),
      })

      // Use array of nullable items to handle unresolved references
      const eventSchema = z.object({
        id: z.string(),
        name: z.string(),
        images: z.array(imageSchema.nullable()).optional(),
      })

      const schemas = {
        events: eventSchema,
        images: imageSchema,
      } as const

      const store = new Store({ schemas, strict: true })

      // Event references images that are NOT in included
      store.sync({
        data: {
          type: 'events',
          id: '1',
          attributes: { name: 'Broken References Event' },
          relationships: {
            images: {
              data: [
                { type: 'images', id: '99' }, // Not in included
                { type: 'images', id: '100' }, // Not in included
              ],
            },
          },
        },
        // No included array - images won't resolve
      })

      const event = store.find('events', '1')
      expect(event).to.not.be.null
      if (event) {
        expect(event.name).to.equal('Broken References Event')
        // Unresolved references become null
        expect(event.images).to.be.an('array')
        if (event.images) {
          expect(event.images).to.have.length(2)
          expect(event.images[0]).to.be.null
          expect(event.images[1]).to.be.null
        }
      }
    })

    it('should handle circular references with z.lazy()', function () {
      interface Comment {
        id: string
        text: string
        replies?: Comment[]
      }

      const commentSchema: z.ZodType<Comment> = z
        .object({
          id: z.string(),
          text: z.string(),
          replies: z.lazy(() => z.array(commentSchema)).optional(),
        })
        .passthrough()

      const schemas = {
        comments: commentSchema,
      } as const

      const store = new Store({ schemas, strict: true })

      store.sync({
        data: {
          type: 'comments',
          id: '1',
          attributes: { text: 'Top-level comment' },
          relationships: {
            replies: {
              data: [{ type: 'comments', id: '2' }],
            },
          },
        },
        included: [
          {
            type: 'comments',
            id: '2',
            attributes: { text: 'Reply to top-level' },
            relationships: {
              replies: {
                data: [{ type: 'comments', id: '3' }],
              },
            },
          },
          {
            type: 'comments',
            id: '3',
            attributes: { text: 'Nested reply' },
          },
        ],
      })

      const comment = store.find('comments', '1')
      expect(comment).to.not.be.null
      if (comment) {
        expect(comment.text).to.equal('Top-level comment')
        // TypeScript infers comment.replies as Comment[] | undefined
        expect(comment.replies).to.be.an('array')
        if (comment.replies) {
          expect(comment.replies).to.have.length(1)
          expect(comment.replies[0].text).to.equal('Reply to top-level')
          // Nested replies
          expect(comment.replies[0].replies).to.be.an('array')
          if (comment.replies[0].replies) {
            expect(comment.replies[0].replies[0].text).to.equal('Nested reply')
          }
        }
      }
    })

    it('should handle mixed resolved and unresolved relationships', function () {
      const imageSchema = z.object({
        id: z.string(),
        url: z.string(),
      })

      const eventSchema = z.object({
        id: z.string(),
        name: z.string(),
        images: z.array(imageSchema.nullable()).optional(),
      })

      const schemas = {
        events: eventSchema,
        images: imageSchema,
      } as const

      const store = new Store({ schemas, strict: true })

      store.sync({
        data: {
          type: 'events',
          id: '1',
          attributes: { name: 'Partial Event' },
          relationships: {
            images: {
              data: [
                { type: 'images', id: '10' }, // Included
                { type: 'images', id: '99' }, // Not included
                { type: 'images', id: '11' }, // Included
              ],
            },
          },
        },
        included: [
          {
            type: 'images',
            id: '10',
            attributes: { url: 'https://example.com/a.jpg' },
          },
          {
            type: 'images',
            id: '11',
            attributes: { url: 'https://example.com/b.jpg' },
          },
        ],
      })

      const event = store.find('events', '1')
      expect(event).to.not.be.null
      if (event) {
        expect(event.images).to.be.an('array')
        if (event.images) {
          expect(event.images).to.have.length(3)
          expect(event.images[0]).to.not.be.null
          expect(event.images[0]?.url).to.equal('https://example.com/a.jpg')
          expect(event.images[1]).to.be.null // Unresolved
          expect(event.images[2]).to.not.be.null
          expect(event.images[2]?.url).to.equal('https://example.com/b.jpg')
        }
      }
    })

    it('should handle deeply nested relationships', function () {
      const categorySchema = z.object({
        id: z.string(),
        name: z.string(),
      })

      const tagSchema = z.object({
        id: z.string(),
        label: z.string(),
        category: categorySchema.optional(),
      })

      const postSchema = z.object({
        id: z.string(),
        title: z.string(),
        tags: z.array(tagSchema).optional(),
      })

      const schemas = {
        posts: postSchema,
        tags: tagSchema,
        categories: categorySchema,
      } as const

      const store = new Store({ schemas, strict: true })

      store.sync({
        data: {
          type: 'posts',
          id: '1',
          attributes: { title: 'Deep Nesting' },
          relationships: {
            tags: {
              data: [{ type: 'tags', id: '10' }],
            },
          },
        },
        included: [
          {
            type: 'tags',
            id: '10',
            attributes: { label: 'tech' },
            relationships: {
              category: {
                data: { type: 'categories', id: '20' },
              },
            },
          },
          {
            type: 'categories',
            id: '20',
            attributes: { name: 'Technology' },
          },
        ],
      })

      const post = store.find('posts', '1')
      expect(post).to.not.be.null
      if (post) {
        expect(post.title).to.equal('Deep Nesting')
        expect(post.tags).to.be.an('array')
        if (post.tags) {
          expect(post.tags[0].label).to.equal('tech')
          expect(post.tags[0].category).to.not.be.undefined
          if (post.tags[0].category) {
            // TypeScript infers category type correctly through nesting
            expect(post.tags[0].category.name).to.equal('Technology')
          }
        }
      }
    })
  })

  describe('ZodLikeSchema interface', function () {
    it('should work with custom ZodLikeSchema implementation', function () {
      interface Event {
        id: string
        name: string
        count: number
      }

      // Custom schema implementing ZodLikeSchema interface
      const eventSchema: ZodLikeSchema = {
        parse(data: unknown): Event {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates at runtime
          const obj = data as Record<string, unknown>
          if (typeof obj.id !== 'string') throw new Error('id must be string')
          if (typeof obj.name !== 'string') throw new Error('name must be string')
          return {
            id: obj.id,
            name: obj.name,
            count: typeof obj.count === 'number' ? obj.count : 0,
          }
        },
        safeParse(data: unknown) {
          try {
            return { success: true, data: this.parse(data) }
          } catch (error) {
            return { success: false, error }
          }
        },
      }

      const store = new Store({
        schemas: { events: eventSchema },
        strict: true,
      })

      store.sync({
        data: {
          type: 'events',
          id: '1',
          attributes: { name: 'Custom Schema Event', count: 42 },
        },
      })

      const event = store.find('events', '1')
      expect(event).to.not.be.null
      if (event) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape
        expect((event as Event).name).to.equal('Custom Schema Event')
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test validates runtime data shape
        expect((event as Event).count).to.equal(42)
      }
    })

    it('should throw with invalid schema missing required methods', function () {
      const invalidSchema = {
        // Missing safeParse method
        parse: () => ({}),
      }

      const store = new Store({
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- Testing invalid schema at runtime
        schemas: { events: invalidSchema as any },
        strict: true,
      })

      expect(() => {
        store.sync({
          data: {
            type: 'events',
            id: '1',
            attributes: { name: 'Test' },
          },
        })
      }).to.throw('Invalid schema: must have parse and safeParse methods')
    })
  })

  describe('Presenting objects from Store', function () {
    it('should present objects retrieved from store with Zod schema', function () {
      const ticketSchema = z
        .object({
          id: z.string(),
          title: z.string(),
          priority: z.number(),
        })
        .passthrough()

      const schemas = { tickets: ticketSchema } as const

      const store = new Store({ schemas, strict: true })

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

      // Retrieve with type inference
      const ticket = store.find('tickets', '1')
      expect(ticket).to.not.be.null

      if (ticket) {
        // Present the schema-validated object
        // This verifies ModelLike accepts objects with inferred types (not Record<string, unknown>)
        const json = Presenter.toJSON(ticket)
        // Compare JSON output (Symbol properties from Store are stripped during serialization)
        expect(JSON.parse(JSON.stringify(json))).to.deep.equal({
          data: {
            type: 'objects',
            id: '1',
            attributes: {
              title: 'Fix bug',
              priority: 5,
            },
          },
        })
      }
    })

    it('should present array of objects from store with Zod schema', function () {
      const eventSchema = z
        .object({
          id: z.string(),
          name: z.string(),
          date: z.string(),
        })
        .passthrough()

      const schemas = { events: eventSchema } as const

      const store = new Store({ schemas, strict: true })

      store.sync({
        data: [
          {
            type: 'events',
            id: '1',
            attributes: { name: 'Conference', date: '2025-06-01' },
          },
          {
            type: 'events',
            id: '2',
            attributes: { name: 'Meetup', date: '2025-07-15' },
          },
        ],
      })

      // Retrieve array with type inference
      const events = store.findAll('events')
      expect(events).to.have.length(2)

      // Present the array of schema-validated objects
      const json = Presenter.toJSON(events)
      // Compare JSON output (Symbol properties from Store are stripped during serialization)
      expect(JSON.parse(JSON.stringify(json))).to.deep.equal({
        data: [
          {
            type: 'objects',
            id: '1',
            attributes: { name: 'Conference', date: '2025-06-01' },
          },
          {
            type: 'objects',
            id: '2',
            attributes: { name: 'Meetup', date: '2025-07-15' },
          },
        ],
      })
    })

    it('should present objects from store with custom ZodLikeSchema', function () {
      // Custom schema that returns a class instance (interface without index signature)
      class Ticket {
        id!: string
        title!: string
        status!: string

        constructor(data: { id: string; title?: string; status?: string }) {
          this.id = data.id
          this.title = data.title || 'Untitled'
          this.status = data.status || 'open'
        }
      }

      const ticketSchema: ZodLikeSchema = {
        parse: (data: unknown): Ticket =>
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test schema, data validated at runtime
          new Ticket(data as { id: string; title?: string; status?: string }),
        safeParse: (data: unknown) => {
          try {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test schema, data validated at runtime
            const ticket = new Ticket(data as { id: string; title?: string; status?: string })
            return { success: true, data: ticket }
          } catch (error) {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test schema, error is always Error
            return { success: false, error: error as Error }
          }
        },
      }

      const store = new Store({
        schemas: { tickets: ticketSchema },
        strict: true,
      })

      store.sync({
        data: {
          type: 'tickets',
          id: '42',
          attributes: {
            title: 'Implement feature',
            status: 'in_progress',
          },
        },
      })

      // Retrieve with type inference - returns Ticket class instance
      const ticket = store.find('tickets', '42')
      expect(ticket).to.not.be.null

      if (ticket) {
        // Present the class instance (which doesn't have an index signature)
        // This is the key test: Ticket class cannot be assigned to Record<string, unknown>
        // but should work with ModelLike = object
        const json = Presenter.toJSON(ticket)
        // Compare JSON output (Symbol properties from Store are stripped during serialization)
        expect(JSON.parse(JSON.stringify(json))).to.deep.equal({
          data: {
            type: 'objects',
            id: '42',
            attributes: {
              title: 'Implement feature',
              status: 'in_progress',
            },
          },
        })
      }
    })

    it('should present objects with custom presenter from store', function () {
      const articleSchema = z
        .object({
          id: z.string(),
          title: z.string(),
          body: z.string(),
          published: z.boolean(),
        })
        .passthrough()

      const schemas = { articles: articleSchema } as const

      class ArticlePresenter extends Presenter {
        static type = 'articles'

        attributes(instance: z.infer<typeof articleSchema> | null) {
          if (!instance) return {}
          return {
            title: instance.title,
            body: instance.body,
            published: instance.published,
          }
        }
      }

      const store = new Store({ schemas, strict: true })

      store.sync({
        data: {
          type: 'articles',
          id: '1',
          attributes: {
            title: 'Hello World',
            body: 'This is the content.',
            published: true,
          },
        },
      })

      const article = store.find('articles', '1')
      expect(article).to.not.be.null

      if (article) {
        // Use typed presenter with schema-inferred object
        const json = ArticlePresenter.toJSON(article)
        expect(json).to.deep.equal({
          data: {
            type: 'articles',
            id: '1',
            attributes: {
              title: 'Hello World',
              body: 'This is the content.',
              published: true,
            },
          },
        })
      }
    })
  })
})
