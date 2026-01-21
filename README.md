# YAYSON

A library for serializing and reading [JSON API](http://jsonapi.org) data in JavaScript.

From version 3 we now support native JavaScript classes. YAYSON has zero dependencies and works in the browser and in node 14 and up.

[![NPM](https://nodei.co/npm/yayson.png?downloads=true)](https://nodei.co/npm/yayson/)

## Installing

Install yayson by running:

```

$ npm i yayson

```

## Presenting data

A basic `Presenter` can look like this:

```javascript
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
const yayson = require('yayson')
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
const yayson = require('yayson')
const { Presenter } = yayson({ adapter: 'sequelize' })
```

You can also define your own adapter globally:

```javascript
const yayson = require('yayson')
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

You can use a `Store` can like this:

```javascript
const { Store } = require('yayson')()
const store = new Store()

const data = await adapter.get({ path: '/events/' + id })
const event = store.sync(data)
```

This will give you the parsed event with all its relationships.

Its also possible to find in the synched data:

```javascript
const event = this.store.find('events', id)

const images = this.store.findAll('images')
```

### Schema Validation and Type Inference

YAYSON supports optional schema validation using [Zod](https://github.com/colinhacks/zod) or any compatible schema library. This enables:

- **Runtime validation**: Ensure your data matches expected schemas
- **TypeScript type inference**: Get full type safety without manual type definitions
- **Strict or safe modes**: Throw errors or collect validation issues

#### Basic Usage with Zod

```typescript
import { z } from 'zod'
import { createStore } from 'yayson'

const eventSchema = z.object({
  id: z.string(),
  type: z.literal('events'),
  name: z.string(),
  date: z.string(),
})

const schemas = {
  events: eventSchema,
} as const

const Store = createStore({ schemas, strict: true })
const store = new Store()

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
const Store = createStore({ schemas, strict: true })
```

**Safe mode** (collects errors without throwing):

```typescript
const Store = createStore({ schemas, strict: false })
const store = new Store()

store.sync(invalidData)

if (store.validationErrors.length > 0) {
  console.warn('Validation issues:', store.validationErrors)
}
```

#### Custom Schema Adapters

You can use any validation library by providing a custom schema adapter:

```typescript
class CustomSchemaAdapter {
  static validate(schema, data, strict) {
    // Your validation logic here
    return {
      valid: true, // or false
      data: validatedData,
      error: undefined, // or error details
    }
  }
}

const Store = createStore({
  schemas: mySchemas,
  schemaAdapter: CustomSchemaAdapter,
})
```

## Use in the browser

Recommended way is to use it via [webpack](https://github.com/webpack/webpack) or similar build system wich lets you just require the package as usual.

If you just want to try it out, copy the file `dist/yayson.js` to your project. Then simply include it:

```html
<script src="./lib/yayson.js"></script>
```

Then you can `var yayson = window.yayson()` use the `yayson.Presenter` and `yayson.Store` as usual.

### Browser support

#### Tested

- Chrome
- Firefox
- Safari
- Safari iOS

#### Untested, but should work

- IE 11
- Android

## Legacy support

Earlier versions of JSON API worked a bit different from 1.0. Therefore YAYSON provides legacy presenters and stores in order to have interoperability between the versions.

### Basic Usage

```javascript
const yayson = require('yayson/legacy')
const { Presenter, Store } = yayson()

const store = new Store({
  types: {
    events: 'event',
    images: 'image',
  },
})

store.sync({
  event: { id: '1', name: 'Demo Event' },
  images: [{ id: '2', url: 'http://example.com/image.jpg' }],
})

const event = store.find('event', '1')
```

### Schema Validation for Legacy Store

The legacy store also supports schema validation and type inference, maintaining full backward compatibility:

```typescript
import { createLegacyStore } from 'yayson'
import { z } from 'zod'

const eventSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  date: z.string(),
})

const Store = createLegacyStore({
  schemas: { event: eventSchema },
  strict: true,
})
const store = new Store()

store.sync({ event: { id: '1', name: 'Event', date: '2025-01-15' } })

// TypeScript infers the correct type
const event = store.find('event', '1')
// event.name, event.date are fully typed!
```

#### Validation with Type Mapping

You can combine type mapping with schemas:

```typescript
const Store = createLegacyStore({
  types: {
    events: 'event', // Map plural to singular
  },
  schemas: {
    event: eventSchema, // Schema uses normalized type
  },
  strict: false, // Safe mode
})
const store = new Store()

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
  type: z.string(),
  name: z.string(),
  images: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
    }),
  ),
})

const Store = createLegacyStore({
  schemas: { event: eventSchema, image: imageSchema },
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
// Relations are resolved before validation
// event.images is an array of validated image objects
```

**Note**: In the legacy store, validation happens lazily when you call `find()`, `findAll()`, or `retrieve()`, not during `sync()`. This is different from the modern store where validation happens immediately during sync.
