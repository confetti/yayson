import Adapter, { type ModelLike } from '../adapter.js'

interface SequelizeModel {
  get(key?: string): unknown
  constructor?: {
    primaryKeys?: Record<string, unknown>
  }
}

class SequelizeAdapter extends Adapter {
  static override get<T = unknown>(model: ModelLike, key?: string): T {
    const seqModel = model as unknown as SequelizeModel | null | undefined
    if (seqModel != null && 'get' in seqModel) {
      return seqModel.get(key) as T
    }
    return undefined as T
  }

  static override id(model: ModelLike): string | undefined {
    const seqModel = model as unknown as SequelizeModel
    // Retain backwards compatibility with older sequelize versions
    const pkFields =
      seqModel.constructor && (seqModel.constructor as any).primaryKeys
        ? Object.keys((seqModel.constructor as any).primaryKeys)
        : ['id']

    if (pkFields.length > 1) {
      throw new Error(
        'YAYSON does not support Sequelize models with composite primary keys. You can only use one column for your primary key. Currently using: ' +
          pkFields.join(','),
      )
    } else if (pkFields.length < 1) {
      throw new Error(
        'YAYSON can only serialize Sequelize models which have a primary key. This is used for the JSON:API model id.',
      )
    }

    const id = this.get(model, pkFields[0])
    if (id === undefined) {
      return id
    }
    return `${id}`
  }
}

export default SequelizeAdapter
