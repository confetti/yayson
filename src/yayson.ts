import Adapter from './yayson/adapter.js'
import * as adapters from './yayson/adapters/index.js'
import createLegacyStore from './yayson/legacy-store.js'
import createPresenter from './yayson/presenter.js'
import SchemaAdapter from './yayson/schema-adapter.js'
import createStore from './yayson/store.js'
import type {
  AdapterConstructor,
  InferModelType,
  InferSchemaType,
  LegacyStoreOptions,
  PresenterConstructor,
  SchemaAdapterConstructor,
  SchemaAdapterInstance,
  SchemaRegistry,
  StoreOptions,
  ValidationError,
  ValidationResult,
} from './yayson/types.js'

type AdapterOption = string | AdapterConstructor

interface YaysonOptions {
  adapter?: AdapterOption
}

interface YaysonResult {
  Store: ReturnType<typeof createStore>
  Presenter: PresenterConstructor
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

export function yayson(options?: YaysonOptions): YaysonResult {
  const adapter = lookupAdapter(options?.adapter)
  const Presenter = createPresenter(adapter)
  const Store = createStore()

  return {
    Store,
    Presenter,
    Adapter,
  }
}

export default yayson
export { Adapter, adapters, createLegacyStore, createPresenter, createStore, SchemaAdapter }
export type {
  InferModelType,
  InferSchemaType,
  LegacyStoreOptions,
  SchemaAdapterConstructor,
  SchemaAdapterInstance,
  SchemaRegistry,
  StoreOptions,
  ValidationError,
  ValidationResult,
  YaysonOptions,
  YaysonResult,
}
