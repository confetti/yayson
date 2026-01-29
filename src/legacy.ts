import yaysonFactory from './yayson.js'
import createLegacyPresenter from './yayson/legacy-presenter.js'
import LegacyStore from './yayson/legacy-store.js'
import type { LegacyData } from './yayson/legacy-store.js'
import type { YaysonOptions } from './yayson.js'

export type { LegacyData }

interface LegacyYaysonResult {
  Store: typeof LegacyStore
  Presenter: ReturnType<typeof createLegacyPresenter>
  Adapter: ReturnType<typeof yaysonFactory>['Adapter']
}

export default function yayson(options?: YaysonOptions): LegacyYaysonResult {
  const { Presenter, Adapter } = yaysonFactory(options)
  return {
    Store: LegacyStore,
    Presenter: createLegacyPresenter(Presenter),
    Adapter,
  }
}
