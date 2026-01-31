import Adapter from './yayson/adapter.js'
import * as adapters from './yayson/adapters/index.js'
import createPresenter, { type PresenterClass, type PresenterInstance } from './yayson/presenter.js'
import Store from './yayson/store.js'
import type {
  AdapterConstructor,
  JsonApiDocument,
  JsonApiLink,
  JsonApiLinks,
  JsonApiRelationship,
  JsonApiRelationships,
  JsonApiResource,
  LegacyStoreOptions,
  PresenterOptions,
  SchemaRegistry,
  StoreOptions,
  ValidationError,
} from './yayson/types.js'
import type { ZodLikeSchema } from './yayson/schema.js'

type AdapterOption = string | AdapterConstructor

interface YaysonOptions {
  adapter?: AdapterOption
}

interface YaysonResult {
  Store: typeof Store
  Presenter: PresenterClass
  Adapter: typeof Adapter
}

function lookupAdapter(nameOrAdapter?: AdapterOption): AdapterConstructor {
  if (nameOrAdapter === 'default' || !nameOrAdapter) {
    return Adapter
  } else if (typeof nameOrAdapter === 'string') {
    if (nameOrAdapter === 'sequelize') {
      return adapters.sequelize
    } else {
      throw new Error('Adapter not found: ' + nameOrAdapter)
    }
  }
  return nameOrAdapter
}

function yayson(options?: YaysonOptions): YaysonResult {
  const adapter = lookupAdapter(options?.adapter)
  const Presenter = createPresenter(adapter)

  return {
    Store,
    Presenter,
    Adapter,
  }
}

export default yayson
export type {
  AdapterConstructor,
  JsonApiDocument,
  JsonApiLink,
  JsonApiLinks,
  JsonApiRelationship,
  JsonApiRelationships,
  JsonApiResource,
  LegacyStoreOptions,
  PresenterClass,
  PresenterInstance,
  PresenterOptions,
  SchemaRegistry,
  StoreOptions,
  ValidationError,
  YaysonOptions,
  YaysonResult,
  ZodLikeSchema,
}
