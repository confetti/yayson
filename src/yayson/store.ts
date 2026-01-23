import type {
  InferModelType,
  JsonApiDocument,
  JsonApiRelationship,
  JsonApiResourceIdentifier,
  SchemaAdapterConstructor,
  SchemaRegistry,
  StoreModel,
  StoreModels,
  StoreOptions,
  StoreRecord as StoreRecordType,
  ValidationError,
} from './types.js'
import DefaultSchemaAdapter from './schema-adapter.js'

class StoreRecord {
  id: string
  type: string
  attributes?: Record<string, unknown>
  relationships?: Record<string, JsonApiRelationship>
  links?: Record<string, unknown>
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
  schemaAdapter: SchemaAdapterConstructor
  strict: boolean
  validationErrors: ValidationError[] = []

  constructor(options?: StoreOptions<S>) {
    this.schemas = options?.schemas
    this.schemaAdapter = options?.schemaAdapter ?? DefaultSchemaAdapter
    this.strict = options?.strict ?? false
    this.reset()
  }

  reset(): void {
    this.records = []
    this.validationErrors = []
  }

  toModel(rec: StoreRecord, type: string, models: StoreModels): StoreModel {
    let typeAttribute: string | undefined
    const model: StoreModel = { ...(rec.attributes || {}), id: '', type: '' }

    if (rec.attributes && 'type' in rec.attributes && typeof rec.attributes.type === 'string') {
      typeAttribute = rec.attributes.type
    }

    model.id = rec.id
    model.type = rec.type
    if (!models[type]) {
      models[type] = {}
    }
    if (!models[type][rec.id]) {
      models[type][rec.id] = model
    }

    if (Object.prototype.hasOwnProperty.call(model, 'meta')) {
      model.attributes = { meta: model.meta }
      delete model.meta
    }

    if (rec.meta != null) {
      model.meta = rec.meta
    }

    if (rec.links != null) {
      model.links = rec.links
    }

    if (rec.relationships != null) {
      for (const key in rec.relationships) {
        const rel = rec.relationships[key]
        const { data } = rel
        const { links } = rel
        const { meta } = rel

        model[key] = null
        if (data == null && links == null) {
          continue
        }
        const resolve = ({ type, id }: JsonApiResourceIdentifier): StoreModel | null => {
          const result = this.find(type, id, models)
          // Type assertion necessary: Runtime type string cannot be type-checked at compile time
          // find<T>(type: T) uses type parameter, but here type is dynamic from relationship data
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          return result as unknown as StoreModel | null
        }
        if (Array.isArray(data)) {
          model[key] = data.map(resolve)
        } else {
          const relModel: Record<string, unknown> | null = data != null ? resolve(data) : {}

          if (relModel) {
            relModel._links = links || {}
            relModel._meta = meta || {}
            model[key] = relModel
          }
        }
      }
    }

    if (typeAttribute) {
      model.type = typeAttribute
    }

    // Validate with schema if provided
    if (this.schemas && this.schemas[rec.type]) {
      const schema = this.schemas[rec.type]
      const result = this.schemaAdapter.validate(schema, model, this.strict)

      if (!result.valid) {
        this.validationErrors.push({
          type: rec.type,
          id: rec.id,
          error: result.error,
        })
      }

      // Type assertion necessary: Schema validation returns unknown but produces valid StoreModel-compatible data
      // This bridges the schema validation system with the store's type system
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return result.data as unknown as StoreModel
    }

    return model
  }

  findRecord(type: string, id: string): StoreRecord | undefined {
    return this.records.find((r) => r.type === type && r.id === id)
  }

  findRecords(type: string): StoreRecord[] {
    return this.records.filter((r) => r.type === type)
  }

  find<T extends string>(type: T, id: string, models?: StoreModels): InferModelType<S, T> | null {
    const modelsObj = models ?? {}
    const rec = this.findRecord(type, id)
    if (rec == null) {
      return null
    }
    if (!modelsObj[type]) {
      modelsObj[type] = {}
    }
    // Type assertion necessary for type inference feature:
    // toModel returns StoreModel, but type system needs to look up actual type from schema registry S using type parameter T
    // TypeScript cannot automatically map string literal T to schema type - this enables type-safe store.find('events') → Event
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return (modelsObj[type][id] || this.toModel(rec, type, modelsObj)) as InferModelType<S, T>
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
    // Type assertion necessary for type inference feature:
    // Object.values returns StoreModel[], but type system needs to infer actual type from schema registry
    // Enables type-safe store.findAll('events') → Event[] without manual type annotations
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return Object.values(modelsObj[type] || {}) as InferModelType<S, T>[]
  }

  remove(type: string, id?: string): void | void[] {
    const removeOne = (record: StoreRecord): void => {
      const index = this.records.indexOf(record)
      if (!(index < 0)) {
        this.records.splice(index, 1)
      }
    }

    if (id != null) {
      const record = this.findRecord(type, id)
      if (record) {
        return removeOne(record)
      }
    } else {
      const records = this.findRecords(type)
      return records.map(removeOne)
    }
  }

  sync<FT extends string = string>(
    body: JsonApiDocument,
    filterType?: FT,
  ):
    | ((InferModelType<S, FT> | InferModelType<S, FT>[] | StoreModel | StoreModel[] | null) & {
        links?: unknown
        meta?: unknown
      })
    | null {
    // Clear previous validation errors
    this.validationErrors = []

    const syncData = (
      data: JsonApiDocument['data'] | JsonApiDocument['included'],
    ): StoreRecord | StoreRecord[] | null => {
      if (data == null) {
        return null
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
        return add({
          ...data,
          attributes: data.attributes ?? undefined,
          relationships: data.relationships ?? undefined,
          id: data.id,
        })
      }
    }

    syncData(body.included)
    const recs = syncData(body.data)

    if (recs == null) {
      return null
    }

    const models: StoreModels = {}
    let result:
      | ((InferModelType<S, FT> | InferModelType<S, FT>[] | StoreModel | StoreModel[]) & {
          links?: unknown
          meta?: unknown
        })
      | null

    if (Array.isArray(recs)) {
      let modelArray = recs.map((rec) => {
        return this.toModel(rec, rec.type, models)
      })
      if (filterType) {
        modelArray = modelArray.filter((model) => model.type === filterType)
      }
      // Type assertion necessary for type inference feature:
      // sync<FT>(body, filterType: FT) needs to infer return type from filterType parameter
      // Enables type-safe store.sync(data, 'events') → Event[] without manual annotations
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      result = Object.assign(modelArray, { links: undefined, meta: undefined }) as unknown as InferModelType<
        S,
        FT
      >[] & {
        links?: unknown
        meta?: unknown
      }
    } else {
      const model = this.toModel(recs, recs.type, models)
      // Type assertion necessary for type inference feature (see array case above)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      result = Object.assign(model, { links: undefined, meta: undefined }) as unknown as InferModelType<S, FT> & {
        links?: unknown
        meta?: unknown
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'links')) {
      result.links = body.links
    }

    if (Object.prototype.hasOwnProperty.call(body, 'meta')) {
      result.meta = body.meta
    }

    return result
  }
}
