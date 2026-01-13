import type {
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

class Store {
  records: StoreRecord[] = []
  schemas?: SchemaRegistry
  schemaAdapter: SchemaAdapterConstructor
  strict: boolean
  validationErrors: ValidationError[] = []

  constructor(options?: StoreOptions) {
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
          return this.find(type, id, models)
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

      if (this.strict) {
        // Strict mode: validate throws on error, so we just return the data
        return result.data as StoreModel
      } else {
        // Safe mode: collect errors but return model
        if (!result.valid) {
          this.validationErrors.push({
            type: rec.type,
            id: rec.id,
            error: result.error,
          })
        }
        return result.data as StoreModel
      }
    }

    return model
  }

  findRecord(type: string, id: string): StoreRecord | undefined {
    return this.records.find((r) => r.type === type && r.id === id)
  }

  findRecords(type: string): StoreRecord[] {
    return this.records.filter((r) => r.type === type)
  }

  find(type: string, id: string, models?: StoreModels): StoreModel | null {
    const modelsObj = models ?? {}
    const rec = this.findRecord(type, id)
    if (rec == null) {
      return null
    }
    if (!modelsObj[type]) {
      modelsObj[type] = {}
    }
    return modelsObj[type][id] || this.toModel(rec, type, modelsObj)
  }

  findAll(type: string, models?: StoreModels): StoreModel[] {
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
    return Object.values(modelsObj[type] || {})
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

  sync<T extends StoreModel = StoreModel>(
    body: JsonApiDocument,
    filterType?: string,
  ): ((T | T[] | null) & { links?: unknown; meta?: unknown }) | null {
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
    let result: ((T | T[]) & { links?: unknown; meta?: unknown }) | null

    if (Array.isArray(recs)) {
      let modelArray = recs.map((rec) => {
        return this.toModel(rec, rec.type, models) as T
      })
      if (filterType) {
        modelArray = modelArray.filter((model) => (model as StoreModel).type === filterType)
      }
      result = Object.assign(modelArray, { links: undefined, meta: undefined }) as T[] & {
        links?: unknown
        meta?: unknown
      }
    } else {
      const model = this.toModel(recs, recs.type, models) as T
      result = Object.assign(model, { links: undefined, meta: undefined }) as T & {
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

export default function createStore(options?: StoreOptions): typeof Store {
  if (options) {
    return class extends Store {
      constructor() {
        super(options)
      }
    }
  }
  return Store
}
