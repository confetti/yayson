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
        const resolve = ({ type, id }: JsonApiResourceIdentifier): StoreModel => {
          const found = this.findModel(type, id, models)
          if (found) {
            return found
          }
          // Create stub for unresolved relationship linkage
          const stub: StoreModel = { id }
          stub[TYPE] = type
          return stub
        }
        if (Array.isArray(data)) {
          // Filter out invalid resource identifiers (id must be non-null per JSON:API spec)
          model[key] = data.filter((item) => item.id != null).map(resolve)
        } else if (data != null && data.id != null) {
          // Valid resource identifier
          const relModel: StoreModel = resolve(data)
          relModel[REL_LINKS] = links || {}
          relModel[REL_META] = meta || {}
          model[key] = relModel
        } else if (data == null && (links != null || meta != null)) {
          // No data but has links/meta - create placeholder to hold them
          const relModel: StoreModel = { id: '' }
          relModel[REL_LINKS] = links || {}
          relModel[REL_META] = meta || {}
          model[key] = relModel
        }
        // else: data.id is null - invalid linkage treated as empty relationship
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

  private findModel(type: string, id: string | number, models: StoreModels): StoreModel | null {
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
    const result = this.findModel(type, id, models ?? {})
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
