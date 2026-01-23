import DefaultSchemaAdapter from './schema-adapter.js'
import type {
  StoreModel,
  StoreModels,
  SchemaRegistry,
  SchemaAdapterConstructor,
  ValidationError,
  InferModelType,
  LegacyStoreOptions,
} from './types.js'

interface LegacyStoreRecordType {
  type: string
  data: Record<string, unknown>
}

interface LegacyLinks {
  [key: string]: {
    type: string
  }
}

type LegacyDataValue = Record<string, unknown> | Array<Record<string, unknown>>

interface LegacyData {
  links?: LegacyLinks
  meta?: Record<string, unknown>
  [key: string]: LegacyDataValue | LegacyLinks | Record<string, unknown> | undefined
}

export default class LegacyStore<S extends SchemaRegistry = SchemaRegistry> {
  types: Record<string, string>
  records: LegacyStoreRecordType[]
  relations: Record<string, Record<string, string>>
  schemas?: S
  schemaAdapter: SchemaAdapterConstructor
  strict: boolean
  validationErrors: ValidationError[]
  models: StoreModels

  constructor(options?: LegacyStoreOptions<S>) {
    this.types = options?.types || {}
    this.schemas = options?.schemas
    this.schemaAdapter = options?.schemaAdapter ?? DefaultSchemaAdapter
    this.strict = options?.strict ?? false
    this.records = []
    this.relations = {}
    this.validationErrors = []
    this.models = {}
  }

  reset(): void {
    this.records = []
    this.relations = {}
    this.validationErrors = []
    this.models = {}
  }

  toModel(rec: LegacyStoreRecordType, type: string, models: StoreModels): StoreModel {
    // Keep original id type from data, but ensure string key for models lookup
    const idStr = String(rec.data.id)

    if (!models[type]) {
      models[type] = {}
    }

    // Return cached model if already built (prevents double validation)
    if (models[type]![idStr]) {
      return models[type]![idStr]!
    }

    // Don't add 'type' to model - preserve original data shape for backwards compatibility
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Legacy format: rec.data has id, spread creates StoreModel-compatible object
    const model: StoreModel = { ...rec.data, id: rec.data.id as string }

    // Store placeholder to handle circular relations
    models[type]![idStr] = model

    const relations = this.relations[type]
    if (relations) {
      for (const attribute in relations) {
        const relationType = relations[attribute]!
        const value = model[attribute]
        model[attribute] = Array.isArray(value)
          ? value.map((id: unknown) => this.find(relationType, String(id), models))
          : this.find(relationType, String(value), models)
      }
    }

    // Validate with schema if provided
    if (this.schemas && this.schemas[type]) {
      const schema = this.schemas[type]
      const result = this.schemaAdapter.validate(schema, model, this.strict)

      if (!result.valid) {
        this.validationErrors.push({
          type,
          id: idStr,
          error: result.error,
        })
      }

      // Store and return validated/transformed data
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Schema validation returns unknown but produces valid StoreModel-compatible data
      const validatedModel = result.data as unknown as StoreModel
      models[type]![idStr] = validatedModel
      return validatedModel
    }

    return model
  }

  setupRelations(links: LegacyLinks): void {
    for (const key in links) {
      const value = links[key]!
      const parts = key.split('.')
      const typeRaw = parts[0]!
      const attribute = parts[1]!
      const type = this.types[typeRaw] || typeRaw
      if (!this.relations[type]) {
        this.relations[type] = {}
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

  // @deprecated Use retrieve() instead.
  retrive<T extends string>(type: T, data: LegacyData): InferModelType<S, T> | null {
    return this.retrieve(type, data)
  }

  retrieve<T extends string>(type: T, data: LegacyData): InferModelType<S, T> | null {
    this.sync(data)
    const typeData = data[type]
    if (!typeData || typeof typeData !== 'object' || Array.isArray(typeData)) {
      throw new Error(`Invalid data for type ${type}`)
    }
    if (!('id' in typeData)) {
      throw new Error(`Data for type ${type} is missing an id`)
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Type inference: retrieve delegates to find with inferred type
    return this.find(type, String(typeData.id)) as InferModelType<S, T> | null
  }

  find<T extends string>(type: T, id: string, models?: StoreModels): InferModelType<S, T> | null {
    const modelsObj = models ?? this.models
    const idStr = String(id)
    const rec = this.findRecord(type, idStr)
    if (rec == null) {
      return null
    }
    if (!modelsObj[type]) {
      modelsObj[type] = {}
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Type inference: maps string literal type parameter to schema type
    return (modelsObj[type]![idStr] || this.toModel(rec, type, modelsObj)) as unknown as InferModelType<S, T>
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
    return Object.values(modelsObj[type] || {}) as unknown as InferModelType<S, T>[]
  }

  remove(type: string, id?: string): void {
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

  sync(data: LegacyData): void {
    // Clear validation errors and models cache from previous sync
    this.validationErrors = []
    this.models = {}

    if (data.links) {
      this.setupRelations(data.links)
    }

    // Track records added in this sync for eager validation
    const syncedRecords: LegacyStoreRecordType[] = []

    for (const name in data) {
      if (name === 'meta' || name === 'links') {
        continue
      }

      const value = data[name]!

      const add = (d: Record<string, unknown>): void => {
        const type = this.types[name] || name
        this.remove(type, String(d.id))
        const rec = { type, data: d }
        this.records.push(rec)
        syncedRecords.push(rec)
      }

      if (Array.isArray(value)) {
        value.forEach(add)
      } else if (typeof value === 'object' && value !== null) {
        add(value)
      }
    }

    // Eager validation: build and validate only newly synced records when schemas are configured
    if (this.schemas) {
      for (const rec of syncedRecords) {
        this.toModel(rec, rec.type, this.models)
      }
    }
  }
}
