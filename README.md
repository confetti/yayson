# YAYSON

A library for serializing and reading [JSON API](http://jsonapi.org) data in JavaScript.

YAYSON supports both ESM and CommonJS, has zero dependencies, and works in the browser and in Node.js 20+.

[![NPM](https://nodei.co/npm/yayson.png?downloads=true)](https://nodei.co/npm/yayson/)

## Installing

```
npm install yayson
```

## Upgrading from 3.x

Version 4.x includes several breaking changes:

### Import syntax changed

**CommonJS** - use named imports instead of default:

```javascript
// 3.x
const yayson = require('yayson')
const { Presenter } = yayson()

// 4.x
const { yayson } = require('yayson')
const { Presenter } = yayson()
```

**Legacy module:**

```javascript
// 3.x
const yayson = require('yayson/legacy')
const { Store } = yayson()

// 4.x
const { yayson } = require('yayson/legacy')
const { Store } = yayson()
```

### Node.js version

Node.js 20+ is now required (was 14+).

## Presenting data

A basic `Presenter` can look like this:

```javascript
// ESM
import yayson from 'yayson'
const { Presenter } = yayson()

// CommonJS
const { yayson } = require('yayson')
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
    id: 5,
    type: 'bikes',
    attributes: {
      id: 5,
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

### Metadata

You can add metadata to the top level object.

```javascript

  ItemsPresenter.render(items, {meta: count: 10})

```

This would produce:

```javascript

{
  meta: {
    count: 10
  }
  data: {
    id: 5,
    type: 'items',
    attributes: {
      id: 5,
      name: 'First'
    }
  }
}

```

## Parsing data

You can use a `Store` like this:

```javascript
import yayson from 'yayson'
const { Store } = yayson()
const store = new Store()

const data = await adapter.get({ path: '/events/' + id })
const allSynced = store.sync(data)
```

The `sync()` method returns all models synced in this call (from both `data` and `included`), with relationships resolved.

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
const { yayson } = require('yayson/legacy')
const { Presenter, Store } = yayson()
```

```javascript
const store = new Store({
  types: {
    events: 'event',
    images: 'image',
  },
})

const allSynced = store.sync({
  event: { id: '1', name: 'Demo Event' },
  images: [{ id: '2', url: 'http://example.com/image.jpg' }],
})
// allSynced contains both the event and images

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
