import type {
  InferModelType,
  JsonApiDocument,
  JsonApiLink,
  JsonApiRelationships,
  JsonApiResourceIdentifier,
  SchemaRegistry,
  StoreModel,
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

  toModel(rec: StoreRecord, type: string, models: StoreModels): StoreModel {
    const model: StoreModel = { ...(rec.attributes || {}), id: rec.id }

    model[TYPE] = rec.type
    const idStr = String(rec.id)
    if (!models[type]) {
      models[type] = {}
    }
    if (!models[type][idStr]) {
      models[type][idStr] = model
    }

    if (rec.meta != null) {
      model[META] = rec.meta
    }

    if (rec.links != null) {
      model[LINKS] = rec.links
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
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Runtime type string cannot use type parameter
          return result as StoreModel | null
        }
        if (Array.isArray(data)) {
          model[key] = data.map(resolve)
        } else {
          const relModel: StoreModel | null = data != null ? resolve(data) : { id: '' }

          if (relModel) {
            relModel[REL_LINKS] = links || {}
            relModel[REL_META] = meta || {}
            model[key] = relModel
          }
        }
      }
    }

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

  find<T extends string>(type: T, id: string | number, models?: StoreModels): InferModelType<S, T> | null {
    const modelsObj = models ?? {}
    const idStr = String(id)
    const rec = this.findRecord(type, idStr)
    if (rec == null) {
      return null
    }
    if (!modelsObj[type]) {
      modelsObj[type] = {}
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Enable type inference from schema registry
    return (modelsObj[type][idStr] || this.toModel(rec, type, modelsObj)) as InferModelType<S, T>
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

  retrieve(body: JsonApiDocument): StoreModel | null
  retrieve<T extends string>(type: T, body: JsonApiDocument): InferModelType<S, T> | null
  retrieve<T extends string>(
    typeOrBody: T | JsonApiDocument,
    body?: JsonApiDocument,
  ): InferModelType<S, T> | StoreModel | null {
    let model: StoreModel | null | undefined = null
    let synced: StoreResult | null = null
    if (typeof typeOrBody === 'object') {
      synced = this.syncAll(typeOrBody)
      model = synced[0] ?? null
    } else {
      synced = this.syncAll(body!)
      model = synced.find((m) => m[TYPE] === typeOrBody)
    }
    if (!model) return null
    if (synced[META]) {
      model[META] = synced[META]
    }
    return model
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
