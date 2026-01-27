import type {
  InferModelType,
  JsonApiDocument,
  JsonApiRelationship,
  JsonApiResourceIdentifier,
  SchemaRegistry,
  StoreModel,
  StoreModels,
  StoreOptions,
  StoreRecord as StoreRecordType,
  ValidationError,
} from './types.js'
import { TYPE, LINKS, META, REL_LINKS, REL_META } from './symbols.js'
import { validate } from './schema.js'

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
    const model: StoreModel = { ...(rec.attributes || {}), id: '' }

    model.id = rec.id
    model[TYPE] = rec.type
    if (!models[type]) {
      models[type] = {}
    }
    if (!models[type][rec.id]) {
      models[type][rec.id] = model
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
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Enable type inference from schema registry
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
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Enable type inference from schema registry
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
        modelArray = modelArray.filter((model) => model[TYPE] === filterType)
      }
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Enable type inference from filterType parameter
      result = Object.assign(modelArray, { links: undefined, meta: undefined }) as InferModelType<S, FT>[] & {
        links?: unknown
        meta?: unknown
      }
    } else {
      const model = this.toModel(recs, recs.type, models)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Enable type inference from filterType parameter
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
