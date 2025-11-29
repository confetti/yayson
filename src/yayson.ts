import Adapter from './yayson/adapter.js'
import * as adapters from './yayson/adapters/index.js'
import createPresenter from './yayson/presenter.js'
import createStore from './yayson/store.js'
import type { AdapterConstructor, PresenterConstructor } from './yayson/types.js'

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

export default function yayson(options?: YaysonOptions): YaysonResult {
  const adapter = lookupAdapter(options?.adapter)
  const Presenter = createPresenter(adapter)
  const Store = createStore()

  return {
    Store,
    Presenter,
    Adapter,
  }
}

export { Adapter, adapters, createPresenter, createStore }
export type { YaysonOptions, YaysonResult }
