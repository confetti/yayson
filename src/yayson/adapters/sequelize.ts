import Adapter, { type ModelLike } from '../adapter.js'

interface SequelizeModel {
  get(key?: string): unknown
  constructor?: {
    primaryKeys?: Record<string, unknown>
  }
}
function isSequelizeModel(model: unknown): model is SequelizeModel {
  return model != null && typeof model === 'object' && 'get' in model && typeof model.get === 'function'
}

class SequelizeAdapter extends Adapter {
  static override get<T = unknown>(model: ModelLike, key?: string): T {
    if (isSequelizeModel(model)) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Sequelize .get() returns unknown, cast to generic T
      return model.get(key) as T
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Non-Sequelize models return undefined, cast to T for generic signature
    return undefined as T
  }

  static override id(model: ModelLike): string | undefined {
    // Retain backwards compatibility with older sequelize versions
    const hasPrimaryKeys = model.constructor && 'primaryKeys' in model.constructor
    const pkFields = hasPrimaryKeys
      ? // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Access primaryKeys for Sequelize v3/v4 compatibility
        Object.keys((model.constructor as unknown as { primaryKeys: Record<string, unknown> }).primaryKeys)
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
