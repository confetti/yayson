import Adapter from './yayson/adapter.js'
import * as adapters from './yayson/adapters/index.js'
import createPresenter, { Presenter } from './yayson/presenter.js'
import Store from './yayson/store.js'
import type {
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

type AdapterOption = string | typeof Adapter

interface YaysonOptions {
  adapter?: AdapterOption
}

interface YaysonResult {
  Store: typeof Store
  Presenter: Presenter
  Adapter: typeof Adapter
}

function lookupAdapter(nameOrAdapter?: AdapterOption): typeof Adapter {
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
  Adapter,
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
  YaysonOptions,
  YaysonResult,
  ZodLikeSchema,
}
