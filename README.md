# YAYSON

A library for serializing and reading [JSON API](http://jsonapi.org) data in JavaScript.

YAYSON supports both ESM and CommonJS, has zero dependencies, and works in the browser and in Node.js 20+.

[![NPM](https://nodei.co/npm/yayson.png?downloads=true)](https://nodei.co/npm/yayson/)

## Installing

```
npm install yayson
```

## Upgrading from 3.x

Version 4.x is a full TypeScript rewrite with several new features and breaking changes.

### New features

- **TypeScript support** — Full type definitions included, with type inference from schema registries
- **Schema validation** — Optional runtime validation using [Zod](https://github.com/colinhacks/zod) or any compatible library with `parse()`/`safeParse()` methods
- **Dual ESM/CJS package** — Native ES module support alongside CommonJS
- **`yayson/utils` entry point** — Helper functions (`getType`, `getLinks`, `getMeta`, `getRelationshipLinks`, `getRelationshipMeta`) for reading model metadata
- **`retrieveAll(type, data)`** — Sync data and return only models of a specific type
- **`syncAll()`** — Always returns an array (useful when you always want array behavior)
- **`fields` property** — Limit which attributes a Presenter includes in its output

### Breaking changes

#### Node.js version

Node.js 20+ is now required (was 14+).

#### Metadata uses Symbols instead of plain properties

In 3.x, resource type, links, and meta were stored as plain properties on models (`model.type`, `model.links`, `model.meta`). Relationship metadata used `model._links` and `model._meta`.

In 4.x, these use Symbol keys to avoid collisions with your data. Use the helpers from `yayson/utils`:

```javascript
// 3.x
model.type
model.links
model.meta
relatedModel._links
relatedModel._meta

// 4.x
import { getType, getLinks, getMeta, getRelationshipLinks, getRelationshipMeta } from 'yayson/utils'
getType(model)
getLinks(model)
getMeta(model)
getRelationshipLinks(relatedModel)
getRelationshipMeta(relatedModel)
```

#### `sync()` restores 3.x behavior

`sync()` now matches 3.x behavior: single resources return a model directly, collections return an array. If you always want an array, use `syncAll()`.

```javascript
// Single resource — returns model directly
const event = store.sync({ data: { type: 'events', id: '1', attributes: { name: 'Demo' } } })
event.name // 'Demo'

// Collection — returns array
const events = store.sync({ data: [{ type: 'events', id: '1', attributes: { name: 'Demo' } }] })
events.length // 1

// Always returns array
const events = store.syncAll(data)

// retrieve/retrieveAll also available
const event = store.retrieve('events', data)
const events = store.retrieveAll('events', data)
```

#### Document-level meta uses Symbols

In 3.x, document-level metadata was stored as `result.meta`. In 4.x, it uses a Symbol key:

```javascript
// 3.x
const result = store.sync(data)
result.meta // { total: 100 }

// 4.x
import { META } from 'yayson/utils'
const result = store.sync(data)
result[META] // { total: 100 }
```

## Presenting data

A basic `Presenter` can look like this:

```javascript
// ESM
import yayson from 'yayson'
const { Presenter } = yayson()

// CommonJS
const yayson = require('yayson')
const { Presenter } = yayson()

class BikePresenter extends Presenter {
  static type = 'bikes'
}

const bike = {
  id: 5,
  name: 'Monark',
}

BikePresenter.render(bike)
```

This would produce:

```javascript

{
  data: {
    id: '5',
    type: 'bikes',
    attributes: {
      name: 'Monark'
    }
  }
}

```

It also works with arrays, so if you send an array to render, "data" will
be an array.

A bit more advanced example:

```javascript
import yayson from 'yayson'
const { Presenter } = yayson()

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
```

### Filtering attributes with fields

Use the static `fields` property to limit which attributes are included in the output:

```javascript
class UserPresenter extends Presenter {
  static type = 'users'
  static fields = ['name', 'email', 'createdAt']
}

const user = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
  password: 'secret',
  createdAt: '2024-01-01',
}

UserPresenter.render(user)
```

This would produce:

```javascript
{
  data: {
    id: '1',
    type: 'users',
    attributes: {
      name: 'John',
      email: 'john@example.com',
      createdAt: '2024-01-01'
    }
  }
}
```

The `password` field is excluded because it's not in the `fields` array. This is useful for hiding sensitive data or reducing payload size without overriding the `attributes()` method.

### Sequelize support

By default it is set up to handle standard JS objects. You can also make
it handle Sequelize.js models like this:

```javascript
import yayson from 'yayson'
const { Presenter } = yayson({ adapter: 'sequelize' })
```

You can also define your own adapter globally:

```javascript
import yayson from 'yayson'
const { Presenter } = yayson({
  adapter: {
    id: function (model) {
      return 'omg' + model.id
    },
    get: function (model, key) {
      return model[key]
    },
  },
})
```

Take a look at the SequelizeAdapter if you want to extend YAYSON to your ORM. Pull requests are welcome. :)

### render() options

The second argument to `render()` accepts an options object with `meta` and `links`:

```javascript
ItemsPresenter.render(items, {
  meta: { total: 100, page: 1 },
  links: {
    self: 'http://example.com/items?page=1',
    next: 'http://example.com/items?page=2',
  },
})
```

This would produce:

```javascript
{
  meta: {
    total: 100,
    page: 1
  },
  links: {
    self: 'http://example.com/items?page=1',
    next: 'http://example.com/items?page=2'
  },
  data: [...]
}
```

Both `meta` and `links` are optional and add top-level properties to the JSON API document.

## Parsing data

You can use a `Store` like this:

```javascript
import yayson from 'yayson'
const { Store } = yayson()
const store = new Store()

const data = await adapter.get({ path: '/events/' + id })
const event = store.sync(data) // single resource → model directly
```

The `sync()` method returns a single model for single resources and an array for collections. Use `syncAll()` if you always want an array.

```javascript
const allSynced = store.syncAll(data) // always returns array
```

### Filtering by type with retrieveAll

Use `retrieveAll()` to sync data and return only models of a specific type:

```javascript
const data = await adapter.get({ path: '/events/' })

// Sync and return only events (filters out included resources)
const events = store.retrieveAll('events', data)
```

This is useful when the response contains multiple types but you only need the primary resources:

```javascript
// Response contains events and their related images
const response = {
  data: [
    { type: 'events', id: '1', attributes: { name: 'Conference' } },
    { type: 'events', id: '2', attributes: { name: 'Meetup' } },
  ],
  included: [{ type: 'images', id: '10', attributes: { url: 'http://example.com/img.jpg' } }],
}

// Get only the events, not the included images
const events = store.retrieveAll('events', response)
// events.length === 2
```

### Finding synced data

You can also find in previously synced data:

```javascript
const event = store.find('events', id)

const images = store.findAll('images')
```

### Schema Validation and Type Inference

YAYSON supports optional schema validation using [Zod](https://github.com/colinhacks/zod) or any compatible schema library. This enables:

- **Runtime validation**: Ensure your data matches expected schemas
- **TypeScript type inference**: Get full type safety without manual type definitions
- **Strict or safe modes**: Throw errors or collect validation issues

#### Basic Usage with Zod

```typescript
import { z } from 'zod'
import yayson from 'yayson'

const { Store } = yayson()

const eventSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    date: z.string(),
  })
  .passthrough()

const schemas = {
  events: eventSchema,
} as const

const store = new Store({ schemas, strict: true })

store.sync({
  data: {
    type: 'events',
    id: '1',
    attributes: { name: 'TypeScript Meetup', date: '2025-01-15' },
  },
})

// TypeScript infers the correct type automatically
const event = store.find('events', '1')
// event.name, event.date are fully typed!
```

#### Validation Modes

**Strict mode** (throws errors on validation failure):

```typescript
const store = new Store({ schemas, strict: true })
```

**Safe mode** (collects errors without throwing):

```typescript
const store = new Store({ schemas, strict: false })

store.sync(invalidData)

if (store.validationErrors.length > 0) {
  console.warn('Validation issues:', store.validationErrors)
}
```

Schemas must be Zod-like objects with `parse()` and `safeParse()` methods. Any library that provides this interface will work.

### Utilities

YAYSON stores metadata on models using Symbol keys. The `yayson/utils` entry point provides helpers for reading them:

```javascript
import { getType, getLinks, getMeta, getRelationshipLinks, getRelationshipMeta } from 'yayson/utils'

const events = store.syncAll(data)
const event = events[0]

getType(event) // 'events'
getLinks(event) // { self: 'http://...' }
getMeta(event) // { createdBy: 'admin' }
getRelationshipLinks(event.image) // { self: 'http://.../relationships/image' }
getRelationshipMeta(event.image) // { permission: 'read' }
```

The raw symbols (`TYPE`, `LINKS`, `META`, `REL_LINKS`, `REL_META`) are also exported from `yayson/utils` if you prefer direct access.

Note that `syncAll()` and `retrieveAll()` return arrays with a `META` symbol property for document-level metadata. Array methods like `.filter()` and `.map()` return plain arrays without this property, so extract it before transforming:

```javascript
import { META } from 'yayson/utils'

const result = store.syncAll(data)
const meta = result[META] // { total: 100, page: 1 }
const filtered = result.filter((e) => e.name === 'Demo')
// filtered[META] is undefined — use the extracted `meta` instead
```

## Claude Code skill

YAYSON includes a [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code/skills) that helps you write Presenters and set up Stores. To install it, copy the `skill/yayson` directory to your project's `.claude/skills/` or your personal `~/.claude/skills/`:

```bash
# Project-level (available to everyone working on that project)
cp -r node_modules/yayson/skill/yayson .claude/skills/

# Personal (available across all your projects)
cp -r node_modules/yayson/skill/yayson ~/.claude/skills/
```

## Use in the browser

Recommended way is to use it via [webpack](https://github.com/webpack/webpack) or similar build system wich lets you just require the package as usual.

## Legacy support

Earlier versions of JSON API worked a bit different from 1.0. Therefore YAYSON provides legacy presenters and stores in order to have interoperability between the versions.

### Basic Usage

```javascript
// ESM
import yayson from 'yayson/legacy'
const { Presenter, Store } = yayson()

// CommonJS
const yayson = require('yayson/legacy')
const { Presenter, Store } = yayson()
```

```javascript
const store = new Store({
  types: {
    events: 'event',
    images: 'image',
  },
})

const event = store.sync({
  event: { id: '1', name: 'Demo Event' },
})
// single resource → returns model directly

const allSynced = store.syncAll({
  event: { id: '1', name: 'Demo Event' },
  images: [{ id: '2', url: 'http://example.com/image.jpg' }],
})
// syncAll always returns array

const event = store.find('event', '1')
```

#### Filtering by type with retrieveAll

Use `retrieveAll()` to sync data and return only models of a specific type:

```javascript
const events = store.retrieveAll('event', {
  event: [
    { id: '1', name: 'Event 1' },
    { id: '2', name: 'Event 2' },
  ],
  image: [{ id: '3', url: 'http://example.com/image.jpg' }],
})
// events.length === 2 (only events, not images)
```

Options can be passed when creating the store:

```javascript
const store = new Store({
  types: { events: 'event' },
})
```

### Schema Validation for Legacy Store

The legacy store also supports schema validation and type inference, maintaining full backward compatibility:

```typescript
import yayson from 'yayson/legacy'
import { z } from 'zod'

const { Store } = yayson()

const eventSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
})

const store = new Store({
  schemas: { event: eventSchema },
  strict: true,
})

store.sync({ event: { id: '1', name: 'Event', date: '2025-01-15' } })

// TypeScript infers the correct type
const event = store.find('event', '1')
// event.name, event.date are fully typed!
```

#### Validation with Type Mapping

You can combine type mapping with schemas:

```typescript
const store = new Store({
  types: {
    events: 'event', // Map plural to singular
  },
  schemas: {
    event: eventSchema, // Schema uses normalized type
  },
  strict: false, // Safe mode
})

store.sync({ events: [{ id: '1', name: 'Event' }] })

if (store.validationErrors.length > 0) {
  console.warn('Validation issues:', store.validationErrors)
}
```

#### Validation with Relations

Schemas validate the complete model after relations are resolved:

```typescript
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

const store = new Store({
  schemas: { event: eventSchema, image: imageSchema },
  strict: true,
})

store.sync({
  links: {
    'event.images': { type: 'image' },
  },
  event: { id: '1', name: 'Event', images: ['2'] },
  image: [{ id: '2', url: 'http://example.com/image.jpg' }],
})

const event = store.find('event', '1')
// Relations are resolved before validation
// event.images is an array of validated image objects
```

**Note**: Validation happens eagerly during `sync()` when schemas are configured. This allows you to check `store.validationErrors` immediately after syncing.
