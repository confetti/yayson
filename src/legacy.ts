import yayson from './yayson.js'
import createLegacyPresenter from './yayson/legacy-presenter.js'
import createLegacyStore from './yayson/legacy-store.js'
import type { YaysonOptions } from './yayson.js'

interface LegacyYaysonResult {
  Store: ReturnType<typeof createLegacyStore>
  Presenter: ReturnType<typeof createLegacyPresenter>
  Adapter: ReturnType<typeof yayson>['Adapter']
}

export default function legacy(options?: YaysonOptions): LegacyYaysonResult {
  const { Store, Presenter, Adapter } = yayson(options)
  return {
    Store: createLegacyStore(),
    Presenter: createLegacyPresenter(Presenter),
    Adapter,
  }
}
