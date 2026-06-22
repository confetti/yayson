import type {
  StoreModel,
  StoreModelWithOptionalId,
  StoreModels,
  StoreResult,
  SchemaRegistry,
  ValidationError,
  InferModelType,
  LegacyStoreOptions,
} from './types.js'
import { TYPE, LINKS, META } from './symbols.js'
import { validate } from './schema.js'
import { safeObject, isUnsafeKey } from './safe.js'

interface LegacyStoreRecordType {
  type: string
  data: Record<string, unknown> & {
    id?: string | number
    meta?: Record<string, unknown>
    links?: Record<string, unknown>
  }
}

interface LegacyLinks {
  [key: string]: {
    type: string
  }
}

type LegacyDataValue = Record<string, unknown> | Array<Record<string, unknown>>

export interface LegacyData {
  links?: LegacyLinks
  meta?: Record<string, unknown>
  [key: string]: LegacyDataValue | LegacyLinks | Record<string, unknown> | undefined
}

function hasId<T extends StoreModelWithOptionalId>(model: T): model is T & { id: string | number } {
  return model.id != null
}

export default class LegacyStore<S extends SchemaRegistry = SchemaRegistry> {
  types: Record<string, string>
  records: LegacyStoreRecordType[]
  relations: Record<string, Record<string, string>>
  schemas?: S
  strict: boolean
  validationErrors: ValidationError[]
  models: StoreModels

  constructor(options?: LegacyStoreOptions<S>) {
    this.types = options?.types || {}
    this.schemas = options?.schemas
    this.strict = options?.strict ?? false
    this.records = []
    this.relations = safeObject<Record<string, Record<string, string>>>()
    this.validationErrors = []
    this.models = safeObject<StoreModels>()
  }

  reset(): void {
    this.records = []
    this.relations = safeObject<Record<string, Record<string, string>>>()
    this.validationErrors = []
    this.models = safeObject<StoreModels>()
  }

  #createStub(type: string, id: string): StoreModel {
    const stub: StoreModel = { id }
    stub[TYPE] = type
    return stub
  }

  #resolveRelationships(
    model: StoreModel | StoreModelWithOptionalId,
    type: string,
    resolver: (relationType: string, id: string) => StoreModel,
  ): void {
    const relations = this.relations[type]
    if (!relations) return

    for (const attribute of Object.keys(relations)) {
      if (isUnsafeKey(attribute)) {
        continue
      }
      const relationType = relations[attribute]!
      const value = model[attribute]
      if (Array.isArray(value)) {
        model[attribute] = value
          .filter((id: unknown) => id != null)
          .map((id: unknown) => resolver(relationType, String(id)))
      } else if (value != null) {
        model[attribute] = resolver(relationType, String(value))
      } else {
        model[attribute] = null
      }
    }
  }

  #createModel(rec: LegacyStoreRecordType, type: string, options?: { models?: StoreModels }): StoreModelWithOptionalId {
    const models = options?.models

    const model: StoreModelWithOptionalId = { ...rec.data }
    if (rec.data.id != null) {
      model.id = rec.data.id
    }
    model[TYPE] = type
    if (rec.data.meta != null) {
      model[META] = rec.data.meta
    }
    if (rec.data.links != null) {
      model[LINKS] = rec.data.links
    }

    if (models && hasId(model)) {
      const idStr = String(model.id)
      if (!models[type]) {
        models[type] = safeObject<StoreModels[string]>()
      }
      models[type]![idStr] = model
    }

    const resolver = (relationType: string, id: string): StoreModel => {
      return (
        this.#findModel(relationType, id, models ?? safeObject<StoreModels>()) ?? this.#createStub(relationType, id)
      )
    }
    this.#resolveRelationships(model, type, resolver)

    return model
  }

  toModel(rec: LegacyStoreRecordType, type: string, models: StoreModels): StoreModel {
    const idStr = String(rec.data.id)

    if (!models[type]) {
      models[type] = safeObject<StoreModels[string]>()
    }

    if (models[type]![idStr]) {
      return models[type]![idStr]!
    }

    const result = this.#createModel(rec, type, { models })
    if (!hasId(result)) {
      throw new Error(`Expected model of type ${type} to have an id`)
    }
    const model = result

    if (this.schemas && this.schemas[type]) {
      const schema = this.schemas[type]
      const result = validate(schema, model, this.strict)

      if (!result.valid) {
        this.validationErrors.push({
          type,
          id: idStr,
          error: result.error,
        })
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Schema validation returns unknown, cast to StoreModel after validation
      const validatedModel = result.data as StoreModel

      // Preserve symbol keys from original model (schema validation may not preserve them)
      validatedModel[TYPE] = model[TYPE]
      validatedModel[LINKS] = model[LINKS]
      validatedModel[META] = model[META]

      models[type]![idStr] = validatedModel
      return validatedModel
    }

    return model
  }

  setupRelations(links: LegacyLinks): void {
    for (const key of Object.keys(links)) {
      const value = links[key]!
      const parts = key.split('.')
      const typeRaw = parts[0]!
      const attribute = parts[1]!
      if (isUnsafeKey(attribute)) {
        continue
      }
      const type = this.types[typeRaw] || typeRaw
      if (!this.relations[type]) {
        this.relations[type] = safeObject<Record<string, string>>()
      }
      this.relations[type]![attribute] = this.types[value.type] || value.type
    }
  }

  findRecord(type: string, id: string): LegacyStoreRecordType | undefined {
    return this.records.find((r) => r.type === type && String(r.data.id) === id)
  }

  findRecords(type: string): LegacyStoreRecordType[] {
    return this.records.filter((r) => r.type === type)
  }

  #findModel(type: string, id: string, models: StoreModels): StoreModel | null {
    const rec = this.findRecord(type, id)
    if (rec == null) {
      return null
    }
    return models[type]?.[id] ?? this.toModel(rec, type, models)
  }

  static build(data: LegacyData): StoreModelWithOptionalId {
    return new LegacyStore().build(data)
  }

  build(data: LegacyData): StoreModelWithOptionalId {
    if (data.links) {
      this.setupRelations(data.links)
    }

    let name: string | undefined
    for (const key of Object.keys(data)) {
      if (key !== 'meta' && key !== 'links') {
        name = key
        break
      }
    }

    if (name == null) {
      throw new Error('build() expects a single resource, not an array')
    }

    const value = data[name]
    if (value == null || Array.isArray(value)) {
      throw new Error('build() expects a single resource, not an array')
    }

    const type = this.types[name] || name
    return this.#createModel({ type, data: value }, type)
  }

  /** @deprecated Use retrieve() instead. */
  retrive<T extends string>(type: T, data: LegacyData): InferModelType<S, T> | null {
    return this.retrieve(type, data)
  }

  retrieve<T extends string>(type: T, data: LegacyData): InferModelType<S, T> | null {
    const synced = this.syncAll(data)
    const normalizedType = this.types[type] || type
    const model = synced.find((m) => m[TYPE] === normalizedType)
    if (!model) return null
    if (synced[META]) {
      model[META] = synced[META]
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Enable type inference from type parameter
    return model as InferModelType<S, T>
  }

  find<T extends string>(type: T, id: string | number, models?: StoreModels): InferModelType<S, T> | null {
    const result = this.#findModel(type, String(id), models ?? this.models)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Type inference: maps string literal type parameter to schema type
    return result as InferModelType<S, T> | null
  }

  findAll<T extends string>(type: T, models?: StoreModels): InferModelType<S, T>[] {
    const modelsObj = models ?? this.models
    const recs = this.findRecords(type)
    if (recs.length === 0) {
      return []
    }
    recs.forEach((rec) => {
      if (!modelsObj[type]) {
        modelsObj[type] = {}
      }
      return this.toModel(rec, type, modelsObj)
    })
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Type inference: maps string literal type parameter to schema type
    return Object.values(modelsObj[type] || {}) as InferModelType<S, T>[]
  }

  remove(type: string, id?: string | number): void {
    const normalizedType = this.types[type] || type

    const removeOne = (record: LegacyStoreRecordType): void => {
      const index = this.records.indexOf(record)
      if (!(index < 0)) {
        this.records.splice(index, 1)
      }
    }

    if (id != null) {
      const idStr = String(id)
      const record = this.findRecord(normalizedType, idStr)
      if (record) {
        removeOne(record)
      }
    } else {
      const records = this.findRecords(normalizedType)
      records.forEach(removeOne)
    }
  }

  syncAll(data: LegacyData): StoreResult {
    // Clear validation errors and models cache from previous sync
    this.validationErrors = []
    this.models = safeObject<StoreModels>()

    if (data.links) {
      this.setupRelations(data.links)
    }

    const syncedRecords: LegacyStoreRecordType[] = []

    for (const name of Object.keys(data)) {
      if (name === 'meta' || name === 'links') {
        continue
      }

      const value = data[name]!
      const type = this.types[name] || name

      const add = (d: Record<string, unknown>): void => {
        this.remove(type, String(d.id))
        const rec: LegacyStoreRecordType = { type, data: d }
        this.records.push(rec)
        syncedRecords.push(rec)
      }

      if (Array.isArray(value)) {
        value.forEach(add)
      } else if (typeof value === 'object' && value !== null) {
        add(value)
      }
    }

    for (const rec of syncedRecords) {
      this.toModel(rec, rec.type, this.models)
    }

    const result: StoreResult = syncedRecords.map((rec) => this.models[rec.type]![String(rec.data.id)]!)
    if (data.meta != null) {
      result[META] = data.meta
    }
    return result
  }

  sync(data: LegacyData): StoreModel | StoreResult {
    const result = this.syncAll(data)
    if (result.length === 1) {
      const model = result[0]
      if (result[META]) {
        model[META] = result[META]
      }
      return model
    }
    return result
  }

  retrieveAll<T extends string>(type: T, data: LegacyData): StoreResult<InferModelType<S, T>> {
    const normalizedType = this.types[type] || type
    const synced = this.syncAll(data)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Enable type inference from type parameter
    const result: StoreResult<InferModelType<S, T>> = synced.filter(
      (model) => model[TYPE] === normalizedType,
    ) as StoreResult<InferModelType<S, T>>
    result[META] = synced[META]
    return result
  }
}
