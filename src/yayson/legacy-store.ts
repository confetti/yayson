import type { StoreModel, StoreModels } from './types.js'

interface LegacyStoreRecordType {
  type: string
  data: Record<string, unknown>
}

interface LegacyStoreOptions {
  types?: Record<string, string>
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

class LegacyStoreClass {
  types: Record<string, string>
  records: LegacyStoreRecordType[]
  relations: Record<string, Record<string, string>>

  constructor(options?: LegacyStoreOptions) {
    this.types = options?.types || {}
    this.records = []
    this.relations = {}
  }

  reset(): void {
    this.records = []
    this.relations = {}
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
  retrive(type: string, data: LegacyData): StoreModel | null {
    return this.retrieve(type, data)
  }

  retrieve(type: string, data: LegacyData): StoreModel | null {
    this.sync(data)
    const typeData = data[type]
    if (!typeData || typeof typeData !== 'object' || Array.isArray(typeData)) {
      throw new Error(`Invalid data for type ${type}`)
    }
    if (!('id' in typeData)) {
      throw new Error(`Data for type ${type} is missing an id`)
    }
    return this.find(type, String(typeData.id))
  }

  find(type: string, id: string, models?: StoreModels): StoreModel | null {
    const modelsObj = models ?? {}
    const idStr = String(id)
    const rec = this.findRecord(type, idStr)
    if (rec == null) {
      return null
    }
    if (!modelsObj[type]) {
      modelsObj[type] = {}
    }
    return modelsObj[type]![idStr] || this.toModel(rec, type, modelsObj)
  }

  findAll(type: string, models?: StoreModels): StoreModel[] {
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
    return Object.values(modelsObj[type] || {})
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

export default function createLegacyStore(): typeof LegacyStoreClass {
  return LegacyStoreClass
}
