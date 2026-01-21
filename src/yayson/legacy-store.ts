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

class LegacyStoreClass<S extends SchemaRegistry = SchemaRegistry> {
  types: Record<string, string>
  records: LegacyStoreRecordType[]
  relations: Record<string, Record<string, string>>
  schemas?: S
  schemaAdapter: SchemaAdapterConstructor
  strict: boolean
  validationErrors: ValidationError[]

  constructor(options?: LegacyStoreOptions<S>) {
    this.types = options?.types || {}
    this.schemas = options?.schemas
    this.schemaAdapter = options?.schemaAdapter ?? DefaultSchemaAdapter
    this.strict = options?.strict ?? false
    this.records = []
    this.relations = {}
    this.validationErrors = []
  }

  reset(): void {
    this.records = []
    this.relations = {}
    this.validationErrors = []
  }

  toModel(rec: LegacyStoreRecordType, type: string, models: StoreModels): StoreModel {
    // Keep original id type from data, but ensure string key for models lookup
    const idStr = String(rec.data.id)
    const model: StoreModel = { ...rec.data, type, id: idStr }
    // Preserve original id type from data (could be number or string)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Legacy format preserves original id type
    model.id = rec.data.id as string
    if (!models[type]) {
      models[type] = {}
    }
    if (!models[type]![idStr]) {
      models[type]![idStr] = model
    }

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

      // Return validated/transformed data
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Schema validation returns unknown but produces valid StoreModel-compatible data
      return result.data as unknown as StoreModel
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
    const modelsObj = models ?? {}
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
    const modelsObj = models ?? {}
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
    // Clear validation errors from previous sync
    this.validationErrors = []

    if (data.links) {
      this.setupRelations(data.links)
    }

    for (const name in data) {
      if (name === 'meta' || name === 'links') {
        continue
      }

      const value = data[name]!

      const add = (d: Record<string, unknown>): void => {
        const type = this.types[name] || name
        this.remove(type, String(d.id))
        this.records.push({ type, data: d })
      }

      if (Array.isArray(value)) {
        value.forEach(add)
      } else if (typeof value === 'object' && value !== null) {
        add(value)
      }
    }
  }
}

export default function createLegacyStore<S extends SchemaRegistry = SchemaRegistry>(
  options?: LegacyStoreOptions<S>,
): typeof LegacyStoreClass<S> {
  if (options) {
    // Capture options in closure for type inference
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Factory pattern with generic schema registry
    return class extends LegacyStoreClass<S> {
      constructor() {
        super(options)
      }
    } as unknown as typeof LegacyStoreClass<S>
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Return base class typed with schema registry S for type inference
  return LegacyStoreClass as unknown as typeof LegacyStoreClass<S>
}
