---
name: yayson
description: Serialize and parse JSON API data with yayson. Use when writing Presenters, setting up Stores (standard or legacy), or working with yayson relationships and schema validation.
---

# YAYSON

## Setup

```typescript
// Standard (JSON API 1.0)
import yayson from 'yayson'
const { Presenter, Store } = yayson()

// Legacy (pre-1.0 format)
import yayson from 'yayson/legacy'
const { Presenter, Store } = yayson()

// Sequelize adapter
const { Presenter } = yayson({ adapter: 'sequelize' })

// Utility helpers for reading symbols off store models
import { getType, getMeta, getLinks, getRelationshipLinks, getRelationshipMeta } from 'yayson/utils'
```

## Presenters

Presenters serialize JS objects into JSON API documents. Subclass Presenter and set `static type`.

### Basic presenter

```typescript
class UserPresenter extends Presenter {
  static type = 'users'
}

UserPresenter.render({ id: 1, name: 'Ada' })
// { data: { type: 'users', id: '1', attributes: { name: 'Ada' } } }
```

### Field filtering

```typescript
class UserPresenter extends Presenter {
  static type = 'users'
  static fields = ['name', 'email']  // whitelist, excludes everything else
}
```

### Relationships

Return a map of property name to Presenter class from `relationships()`. Related data goes into `included`.

```typescript
class WheelPresenter extends Presenter {
  static type = 'wheels'
}

class BikePresenter extends Presenter {
  static type = 'bikes'
  relationships() {
    return { wheels: WheelPresenter }
  }
}

BikePresenter.render({ id: 1, wheels: [{ id: 10 }, { id: 11 }] })
// data.relationships.wheels.data = [{ type: 'wheels', id: '10' }, ...]
// included = [{ type: 'wheels', id: '10', ... }, ...]
```

### Custom attributes

Override `attributes()` to transform or compute attributes.

```typescript
class EventPresenter extends Presenter {
  static type = 'events'
  attributes(instance) {
    const attrs = super.attributes(instance)
    return { ...attrs, slug: attrs.name.toLowerCase().replace(/ /g, '-') }
  }
}
```

### Links

Override `selfLinks()` for resource links and `links()` for relationship links.

```typescript
class CarPresenter extends Presenter {
  static type = 'cars'
  relationships() { return { motor: MotorPresenter } }
  selfLinks(instance) { return '/cars/' + this.id(instance) }
  links(instance) {
    return {
      motor: {
        self: this.selfLinks(instance) + '/relationships/motor',
        related: this.selfLinks(instance) + '/motor'
      }
    }
  }
}
```

### Render options

Pass `meta` and `links` as top-level document properties:

```typescript
ItemPresenter.render(items, {
  meta: { total: 100, page: 1 },
  links: { self: '/items?page=1', next: '/items?page=2' }
})
```

Rendering `null` produces `{ data: null }`. Arrays produce `{ data: [...] }`.

## Store (Standard)

Parses JSON API documents, resolves relationships, and caches models.

```typescript
const store = new Store()
```

### Syncing data

```typescript
// sync: returns model for single resource, array for collection
const event = store.sync({ data: { type: 'events', id: '1', attributes: { name: 'Demo' } } })

// syncAll: always returns array
const events = store.syncAll(jsonApiDocument)

// retrieve: returns single model or null (type-filtered)
const event = store.retrieve('events', jsonApiDocument)

// retrieveAll: always returns array, filtered by type
const images = store.retrieveAll('images', jsonApiDocument)
```

### Querying cached data

```typescript
store.find('events', 1)      // single model or null
store.findAll('events')       // all cached events
store.remove('events', 1)     // remove one
store.remove('events')        // remove all of type
store.reset()                 // clear everything
```

### Relationships resolve automatically

```typescript
store.sync({
  data: { type: 'events', id: '1', relationships: { images: { data: [{ type: 'images', id: '2' }] } } },
  included: [{ type: 'images', id: '2', attributes: { url: 'pic.jpg' } }]
})
const event = store.find('events', '1')
event.images[0].url  // 'pic.jpg'
```

### Schema validation

Accepts any Zod-like schema (must have `parse`/`safeParse` methods). Use `.passthrough()` on Zod objects so extra attributes aren't stripped.

```typescript
import { z } from 'zod'

const eventSchema = z.object({
  id: z.string(),
  name: z.string(),
}).passthrough()

const store = new Store({
  schemas: { events: eventSchema },
  strict: true   // throws on validation error; false collects in store.validationErrors
})
```

### Accessing metadata via symbols

```typescript
import { getType, getMeta, getLinks, getRelationshipLinks, getRelationshipMeta } from 'yayson/utils'

const event = store.find('events', '1')
getType(event)                        // 'events'
getMeta(event)                        // resource meta
getLinks(event)                       // resource links
getRelationshipLinks(event.images)    // relationship links
getRelationshipMeta(event.images)     // relationship meta
```

## Store (Legacy)

For pre-JSON API 1.0 flat format. Import from `yayson/legacy`.

```typescript
import yayson from 'yayson/legacy'
const { Store } = yayson()

const store = new Store({
  types: { events: 'event', images: 'image' }  // plural -> singular mapping
})
```

### Legacy data format

```typescript
store.sync({
  links: {
    'event.images': { type: 'images' },
    'images.event': { type: 'event' }
  },
  event: { id: 1, name: 'Demo', images: [2] },
  images: [{ id: 2, event: 1, url: 'pic.jpg' }]
})

const event = store.find('event', 1)
event.images[0].url  // 'pic.jpg'
```

The API methods (`sync`, `syncAll`, `retrieve`, `retrieveAll`, `find`, `findAll`, `remove`, `reset`) work the same as the standard Store. Schema validation is also supported.

## Quick Reference

For detailed API reference including all method signatures, return types, and edge cases, see [references/api.md](references/api.md).
