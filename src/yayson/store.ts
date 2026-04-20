import type {
  InferModelType,
  JsonApiDocument,
  JsonApiLink,
  JsonApiRelationships,
  JsonApiResourceIdentifier,
  SchemaRegistry,
  StoreModel,
  StoreModelWithOptionalId,
  StoreModels,
  StoreOptions,
  StoreRecord as StoreRecordType,
  StoreResult,
  ValidationError,
} from './types.js'
import { TYPE, LINKS, META, REL_LINKS, REL_META } from './symbols.js'
import { validate } from './schema.js'

class StoreRecord implements StoreRecordType {
  id: string | number
  type: string
  attributes?: Record<string, unknown>
  relationships?: JsonApiRelationships
  links?: JsonApiLink
  meta?: Record<string, unknown>

  constructor(options: StoreRecordType) {
    this.id = options.id
    this.type = options.type
    this.attributes = options.attributes
    this.relationships = options.relationships
    this.links = options.links
    this.meta = options.meta
  }
}

export default class Store<S extends SchemaRegistry = SchemaRegistry> {
  records: StoreRecord[] = []
  schemas?: S
  strict: boolean
  validationErrors: ValidationError[] = []

  constructor(options?: StoreOptions<S>) {
    this.schemas = options?.schemas
    this.strict = options?.strict ?? false
    this.reset()
  }

  reset(): void {
    this.records = []
    this.validationErrors = []
  }

  #createStub(type: string, id: string | number): StoreModel {
    const stub: StoreModel = { id }
    stub[TYPE] = type
    return stub
  }

  #createModel(
    resource: {
      type: string
      id?: string | number | null
      attributes?: Record<string, unknown> | null
      relationships?: JsonApiRelationships | null
      meta?: Record<string, unknown> | null
      links?: JsonApiLink | null
    },
    options?: {
      models?: StoreModels
      includeRelMeta?: boolean
    },
  ): StoreModelWithOptionalId {
    const models = options?.models ?? {}

    const model: StoreModelWithOptionalId = { ...(resource.attributes || {}) }
    if (resource.id != null) {
      model.id = resource.id
    }
    const type = resource.type
    model[TYPE] = type
    if (resource.meta != null) {
      model[META] = resource.meta
    }
    if (resource.links != null) {
      model[LINKS] = resource.links
    }

    // Cache before resolving relationships (for circular refs)
    if (model.id != null) {
      const idStr = String(model.id)
      if (!models[type]) {
        models[type] = {}
      }
      if (!models[type][idStr]) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- model.id is checked above
        models[type][idStr] = model as StoreModel
      }
    }

    if (resource.relationships != null) {
      const resolver = (ref: JsonApiResourceIdentifier): StoreModel => {
        return this.#findModel(ref.type, ref.id, models) ?? this.#createStub(ref.type, ref.id)
      }
      this.#resolveRelationships(model, resource.relationships, resolver, {
        includeRelMeta: options?.includeRelMeta,
      })
    }
    return model
  }

  #resolveRelationships(
    model: StoreModel | StoreModelWithOptionalId,
    relationships: JsonApiRelationships,
    resolver: (ref: JsonApiResourceIdentifier) => StoreModel | StoreModelWithOptionalId,
    options?: { includeRelMeta?: boolean },
  ): void {
    const includeRelMeta = options?.includeRelMeta ?? true

    for (const key in relationships) {
      const rel = relationships[key]
      const { data, links, meta } = rel

      model[key] = null
      if (data == null && links == null) {
        continue
      }

      if (Array.isArray(data)) {
        model[key] = data.filter((item) => item.id != null).map(resolver)
      } else if (data != null && data.id != null) {
        const relModel = resolver(data)
        if (includeRelMeta) {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- REL_LINKS/REL_META only used when resolver returns StoreModel
          const modelWithMeta = relModel as StoreModel
          modelWithMeta[REL_LINKS] = links || {}
          modelWithMeta[REL_META] = meta || {}
        }
        model[key] = relModel
      } else if (data == null && (links != null || meta != null) && includeRelMeta) {
        const relModel: StoreModel = { id: '' }
        relModel[REL_LINKS] = links || {}
        relModel[REL_META] = meta || {}
        model[key] = relModel
      }
    }
  }

  toModel(rec: StoreRecord, type: string, models: StoreModels): StoreModel {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- StoreRecord always has id
    const model = this.#createModel(rec, { models }) as StoreModel

    // Validate with schema if provided
    if (this.schemas && this.schemas[rec.type]) {
      const schema = this.schemas[rec.type]
      const result = validate(schema, model, this.strict)

      if (!result.valid) {
        this.validationErrors.push({
          type: rec.type,
          id: rec.id,
          error: result.error,
        })
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Schema validation returns unknown, cast to StoreModel after validation
      const validatedModel = result.data as StoreModel

      // Preserve symbol keys from original model (schema validation may not preserve them)
      validatedModel[TYPE] = model[TYPE]
      validatedModel[LINKS] = model[LINKS]
      validatedModel[META] = model[META]

      return validatedModel
    }

    return model
  }

  findRecord(type: string, id: string | number): StoreRecord | undefined {
    const idStr = String(id)
    return this.records.find((r) => r.type === type && String(r.id) === idStr)
  }

  findRecords(type: string): StoreRecord[] {
    return this.records.filter((r) => r.type === type)
  }

  #findModel(type: string, id: string | number, models: StoreModels): StoreModel | null {
    const idStr = String(id)
    const cached = models[type]?.[idStr]
    if (cached) {
      return cached
    }
    const rec = this.findRecord(type, id)
    if (rec == null) {
      return null
    }
    return this.toModel(rec, type, models)
  }

  find<T extends string>(type: T, id: string | number, models?: StoreModels): InferModelType<S, T> | null {
    const result = this.#findModel(type, id, models ?? {})
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Enable type inference from schema registry
    return result as InferModelType<S, T> | null
  }

  findAll<T extends string>(type: T, models?: StoreModels): InferModelType<S, T>[] {
    const modelsObj = models ?? {}
    const recs = this.findRecords(type)
    if (recs == null) {
      return []
    }
    recs.forEach((rec) => {
      if (!modelsObj[type]) {
        modelsObj[type] = {}
      }
      return this.toModel(rec, type, modelsObj)
    })
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Enable type inference from schema registry
    return Object.values(modelsObj[type] || {}) as InferModelType<S, T>[]
  }

  remove(type: string, id?: string | number): void {
    const removeOne = (record: StoreRecord): void => {
      const index = this.records.indexOf(record)
      if (!(index < 0)) {
        this.records.splice(index, 1)
      }
    }

    if (id != null) {
      const record = this.findRecord(type, String(id))
      if (record) {
        removeOne(record)
      }
    } else {
      this.findRecords(type).forEach(removeOne)
    }
  }

  syncAll(body: JsonApiDocument): StoreResult {
    // Clear previous validation errors
    this.validationErrors = []

    // Snapshot for rollback if strict validation throws
    const previousRecords = [...this.records]

    const syncData = (data: JsonApiDocument['data'] | JsonApiDocument['included']): StoreRecord[] => {
      if (data == null) {
        return []
      }
      const add = (obj: StoreRecordType): StoreRecord => {
        const { type, id } = obj
        this.remove(type, id)
        const rec = new StoreRecord(obj)
        this.records.push(rec)
        return rec
      }

      if (Array.isArray(data)) {
        return data.map((item) => {
          if (!item.id) {
            throw new Error(`Resource of type ${item.type} is missing an id`)
          }
          return add({
            ...item,
            attributes: item.attributes ?? undefined,
            relationships: item.relationships ?? undefined,
            id: item.id,
          })
        })
      } else {
        if (!data.id) {
          throw new Error(`Resource of type ${data.type} is missing an id`)
        }
        return [
          add({
            ...data,
            attributes: data.attributes ?? undefined,
            relationships: data.relationships ?? undefined,
            id: data.id,
          }),
        ]
      }
    }

    try {
      syncData(body.included)
      const recs = syncData(body.data)

      const models: StoreModels = {}
      const result: StoreResult = recs.map((rec) => this.toModel(rec, rec.type, models))
      if (body.meta != null) {
        result[META] = body.meta
      }
      return result
    } catch (e) {
      this.records = previousRecords
      throw e
    }
  }

  sync(body: JsonApiDocument): StoreModel | StoreResult {
    const result = this.syncAll(body)
    if (!Array.isArray(body.data) && body.data != null) {
      const model = result[0]
      if (result[META]) {
        model[META] = result[META]
      }
      return model
    }
    return result
  }

  /**
   * Build a model from a JSON:API document without storing it.
   * Useful for create payloads where id may be absent.
   *
   * Per JSON:API spec: "The id member is not required when the resource object
   * originates at the client and represents a new resource to be created on the server."
   */
  static build(body: JsonApiDocument): StoreModelWithOptionalId {
    return new Store().build(body)
  }

  build(body: JsonApiDocument): StoreModelWithOptionalId {
    const { data } = body
    if (data == null || Array.isArray(data)) {
      throw new Error('build() expects a single resource in data, not null or an array')
    }
    return this.#createModel(data)
  }

  retrieve<T extends string>(type: T, body: JsonApiDocument): InferModelType<S, T> | null {
    const synced = this.syncAll(body)
    const model = synced.find((m) => m[TYPE] === type)
    if (!model) return null
    if (synced[META]) {
      model[META] = synced[META]
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Enable type inference from type parameter
    return model as InferModelType<S, T>
  }

  retrieveAll<T extends string>(type: T, body: JsonApiDocument): StoreResult<InferModelType<S, T>> {
    const synced = this.syncAll(body)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Enable type inference from type parameter
    const result: StoreResult<InferModelType<S, T>> = synced.filter((model) => model[TYPE] === type) as StoreResult<
      InferModelType<S, T>
    >
    result[META] = synced[META]
    return result
  }
}
