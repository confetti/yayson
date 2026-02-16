# YAYSON API Reference

## Table of Contents

- [Factory Function](#factory-function)
- [Presenter](#presenter)
- [Store (Standard)](#store-standard)
- [Store (Legacy)](#store-legacy)
- [Symbols & Utilities](#symbols--utilities)
- [Adapters](#adapters)
- [Type Inference](#type-inference)

## Factory Function

```typescript
import yayson from 'yayson'
// or: import yayson from 'yayson/legacy'

function yayson(options?: {
  adapter?: 'default' | 'sequelize' | AdapterClass
}): { Presenter: typeof Presenter, Store: typeof Store, Adapter: typeof Adapter }
```

## Presenter

### Static Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `string` | `'objects'` | JSON API resource type name |
| `fields` | `string[]` | `undefined` | Attribute whitelist (undefined = all) |
| `adapter` | `typeof Adapter` | injected | Data access adapter |

### Instance Methods

#### `relationships(): Record<string, typeof Presenter>`

Return map of property names to their Presenter classes. Relationship keys are automatically excluded from attributes.

```typescript
relationships() {
  return { author: AuthorPresenter, comments: CommentPresenter }
}
```

#### `attributes(instance): Record<string, unknown>`

Return attributes for the resource. Default strips `id` and relationship keys, then applies `fields` filter. Override to customize.

#### `selfLinks(instance): string | { self: string, related?: string } | undefined`

Return links for the resource itself. String is normalized to `{ self: string }`.

#### `links(instance): Record<string, { self: string, related?: string }> | undefined`

Return links keyed by relationship name. Applied to each relationship in the output.

#### `id(instance): string | undefined`

Extract ID via adapter. Returns stringified ID.

### Static Methods

#### `render(instanceOrCollection, options?): JsonApiDocument`
#### `toJSON(instanceOrCollection, options?): JsonApiDocument`

Serialize one or many instances to a JSON API document. `render` and `toJSON` are identical.

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `meta` | `Record<string, unknown>` | Top-level `meta` in the document |
| `links` | `JsonApiLinks` | Top-level `links` in the document |

**Return value:** `{ data, included?, meta?, links? }`

- Single instance: `data` is a resource object
- Array: `data` is an array of resource objects
- `null`/`undefined`: `data` is `null`
- `included` only present when relationships exist, automatically deduplicated

### Circular Relationships

Presenters handle circular references. If `Car` has a `Motor` and `Motor` has a `Car`, the serializer tracks visited resources and avoids infinite recursion. Circular resources appear once in `included`.

## Store (Standard)

```typescript
new Store<S extends SchemaRegistry>(options?: {
  schemas?: S
  strict?: boolean  // default: false
})
```

### Methods

#### `sync(body: JsonApiDocument): StoreModel | StoreModel[]`

Sync a JSON API document. Returns a single model when `data` is a single resource, an array when `data` is an array.

#### `syncAll(body: JsonApiDocument): StoreModel[]`

Always returns an array. Processes `included` first, then `data`. Clears previous validation errors. On strict validation failure, rolls back store state.

#### `retrieve(body: JsonApiDocument): StoreModel | null`
#### `retrieve<T>(type: T, body: JsonApiDocument): InferModelType<S, T> | null`

Single-argument form: syncs and returns first model or null.
Two-argument form: syncs and returns first model matching `type`, or null.

#### `retrieveAll<T>(type: T, body: JsonApiDocument): InferModelType<S, T>[]`

Sync and return only models of specified type, preserving order from `data`.

#### `find<T>(type: T, id: string | number): InferModelType<S, T> | null`

Look up a previously synced model by type and ID. Accepts numeric or string ID.

#### `findAll<T>(type: T): InferModelType<S, T>[]`

Return all synced models of a given type.

#### `remove(type: string, id?: string | number): void`

Remove a specific model or all models of a type.

#### `reset(): void`

Clear all cached data and validation errors.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `validationErrors` | `ValidationError[]` | Errors from non-strict validation. Each has `type`, `id`, `error` |

### Validation Modes

**strict: true** - Throws on first validation error. Store state rolls back (unchanged).

**strict: false** (default) - Collects errors in `store.validationErrors`. Models are still created. Each error contains:

```typescript
{ type: string, id: string, error: ZodError | Error }
```

### ID Handling

- IDs are stored and matched as strings internally
- Numeric IDs in source data are preserved on the model (e.g. `event.id` stays `1` not `'1'`)
- `find('events', 1)` and `find('events', '1')` both work
- Numeric IDs are preserved through relationship resolution

### Duplicate Handling

When the same resource (same type + id) appears multiple times, the store deduplicates by keeping one copy.

## Store (Legacy)

```typescript
new LegacyStore<S extends SchemaRegistry>(options?: {
  types?: Record<string, string>  // plural -> singular type mapping
  schemas?: S
  strict?: boolean
})
```

### Key Differences from Standard Store

1. **Data format**: Flat objects keyed by type name, not JSON API envelope
2. **Type mapping**: `types` option maps plural keys to singular type names
3. **Relationship links**: Defined in a `links` object within the data

### Legacy Data Structure

```typescript
{
  links: {
    'event.images': { type: 'images' },
    'images.event': { type: 'event' }
  },
  event: { id: 1, name: 'Demo', images: [2] },       // single
  images: [{ id: 2, event: 1, url: 'pic.jpg' }]       // array
}
```

### Methods

Same as standard Store: `sync`, `syncAll`, `retrieve`, `retrieveAll`, `find`, `findAll`, `remove`, `reset`.

Note: `find`/`findAll` use the **singular** (mapped) type name, not the plural key.

## Symbols & Utilities

Import from `yayson/utils`:

```typescript
import { TYPE, LINKS, META, REL_LINKS, REL_META } from 'yayson/utils'
import { getType, getLinks, getMeta, getRelationshipLinks, getRelationshipMeta } from 'yayson/utils'
```

| Symbol | Helper | Stored On | Contains |
|--------|--------|-----------|----------|
| `TYPE` | `getType(model)` | Any model | Resource type string |
| `META` | `getMeta(model)` | Any model | Resource-level meta |
| `LINKS` | `getLinks(model)` | Any model | Resource-level links |
| `REL_LINKS` | `getRelationshipLinks(rel)` | Relationship value | Relationship links |
| `REL_META` | `getRelationshipMeta(rel)` | Relationship value | Relationship meta |

Symbols survive schema validation (explicitly copied after `parse()`).

## Adapters

### Default Adapter

Works with plain JS objects.

```typescript
Adapter.get(model)         // returns shallow copy of all properties
Adapter.get(model, 'key')  // returns single property value
Adapter.id(model)          // returns model.id as string
```

### Sequelize Adapter

Works with Sequelize model instances by calling `model.get()`.

```typescript
const { Presenter } = yayson({ adapter: 'sequelize' })
```

### Custom Adapter

Any object with static `id(model)` and `get(model, key?)` methods:

```typescript
const { Presenter } = yayson({
  adapter: {
    id: (model) => String(model.pk),
    get: (model, key) => key ? model.attrs[key] : model.attrs
  }
})
```

## Type Inference

With schema registry, store methods infer TypeScript types automatically:

```typescript
const schemas = {
  events: z.object({ id: z.string(), name: z.string() }).passthrough(),
  images: z.object({ id: z.string(), url: z.string() }).passthrough(),
} as const

const store = new Store({ schemas })

const event = store.find('events', '1')
// TypeScript infers: { id: string, name: string, [key: string]: unknown } | null

const images = store.findAll('images')
// TypeScript infers: { id: string, url: string, [key: string]: unknown }[]
```

The `as const` on the schemas object is required for type inference to work.
