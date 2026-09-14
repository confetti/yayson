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
import { safeObject, safeCache, isUnsafeKey, getCachedModel, getCachedModels, setCachedModel } from './safe.js'

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
    // Null-prototype: read with untrusted `name`/`type` values, so "__proto__"
    // must not resolve to Object.prototype.
    this.types = safeObject<Record<string, string>>()
    Object.assign(this.types, options?.types)
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

  *#resolveRelationships(
    model: StoreModel | StoreModelWithOptionalId,
    type: string,
  ): Generator<{ type: string; id: string }, void, StoreModel> {
    const relations = this.relations[type]
    if (!relations) return

    for (const attribute of Object.keys(relations)) {
      if (isUnsafeKey(attribute)) {
        continue
      }
      const relationType = relations[attribute]!
      const value = model[attribute]
      if (Array.isArray(value)) {
        const related: StoreModel[] = []
        for (const id of value.filter((id: unknown) => id != null)) {
          related.push(yield { type: relationType, id: String(id) })
        }
        model[attribute] = related
      } else if (value != null) {
        model[attribute] = yield { type: relationType, id: String(value) }
      } else {
        model[attribute] = null
      }
    }
  }

  *#createModel(
    rec: LegacyStoreRecordType,
    type: string,
    options?: { models?: StoreModels },
  ): Generator<{ type: string; id: string }, StoreModelWithOptionalId, StoreModel> {
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
      setCachedModel(models, type, idStr, model)
    }

    yield* this.#resolveRelationships(model, type)

    return model
  }

  #resolveModel(
    rec: LegacyStoreRecordType,
    type: string,
    options: { shouldValidate: true; models: StoreModels } | { shouldValidate: false; models?: undefined },
  ): StoreModelWithOptionalId {
    // Each generator pauses at a relationship until its child is fully resolved.
    // Keep unfinished models on an explicit stack instead of using recursive calls.
    const pendingModelResolutions = [
      { iterator: this.#createModel(rec, type, { models: options.models }), record: rec, type, ...options },
    ]
    let resolved: StoreModel | undefined
    while (pendingModelResolutions.length > 0) {
      const current = pendingModelResolutions[pendingModelResolutions.length - 1]
      const result = resolved === undefined ? current.iterator.next() : current.iterator.next(resolved)
      resolved = undefined
      if (result.done) {
        const model = current.shouldValidate
          ? this.#validateModel(current.record, current.type, result.value, current.models)
          : result.value
        pendingModelResolutions.pop()
        if (pendingModelResolutions.length === 0) return model
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Related models originate from StoreRecords; schemas may strip the id
        resolved = model as StoreModel
        continue
      }

      const ref = result.value
      const relatedRecord = this.findRecord(ref.type, ref.id)
      if (!relatedRecord) {
        resolved = this.#createStub(ref.type, ref.id)
        continue
      }
      // Preserve build()'s separate cache for each relationship of its root.
      const relatedModels = current.models ?? safeObject<StoreModels>()
      const cached = getCachedModel(relatedModels, ref.type, ref.id)
      if (cached) {
        resolved = cached
      } else {
        pendingModelResolutions.push({
          iterator: this.#createModel(relatedRecord, ref.type, { models: relatedModels }),
          record: relatedRecord,
          type: ref.type,
          models: relatedModels,
          shouldValidate: true,
        })
      }
    }
    throw new Error('Model resolution completed without a model')
  }

  toModel(rec: LegacyStoreRecordType, type: string, modelsArg: StoreModels): StoreModel {
    const idStr = String(rec.data.id)
    const models = safeCache(modelsArg)

    const cached = getCachedModel(models, type, idStr)
    if (cached) {
      return cached
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Stored models are checked for an id before validation
    return this.#resolveModel(rec, type, { shouldValidate: true, models }) as StoreModel
  }

  #validateModel(
    rec: LegacyStoreRecordType,
    type: string,
    model: StoreModelWithOptionalId,
    models: StoreModels,
  ): StoreModel {
    if (!hasId(model)) {
      throw new Error(`Expected model of type ${type} to have an id`)
    }
    const idStr = String(rec.data.id)

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

      setCachedModel(models, type, idStr, validatedModel)
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
    return getCachedModel(models, type, id) ?? this.toModel(rec, type, models)
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
    return this.#resolveModel({ type, data: value }, type, { shouldValidate: false })
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
    const result = this.#findModel(type, String(id), safeCache(models ?? this.models))
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Type inference: maps string literal type parameter to schema type
    return result as InferModelType<S, T> | null
  }

  findAll<T extends string>(type: T, models?: StoreModels): InferModelType<S, T>[] {
    const modelsObj = safeCache(models ?? this.models)
    const recs = this.findRecords(type)
    if (recs.length === 0) {
      return []
    }
    recs.forEach((rec) => {
      return this.toModel(rec, type, modelsObj)
    })
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Type inference: maps string literal type parameter to schema type
    return getCachedModels(modelsObj, type) as InferModelType<S, T>[]
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

    const result: StoreResult = syncedRecords.map((rec) => getCachedModel(this.models, rec.type, String(rec.data.id))!)
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
