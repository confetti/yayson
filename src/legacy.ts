import { yayson as yaysonFactory } from './yayson.js'
import createLegacyPresenter from './yayson/legacy-presenter.js'
import createLegacyStore from './yayson/legacy-store.js'
import type { YaysonOptions } from './yayson.js'

interface LegacyYaysonResult {
  Store: ReturnType<typeof createLegacyStore>
  Presenter: ReturnType<typeof createLegacyPresenter>
  Adapter: ReturnType<typeof yaysonFactory>['Adapter']
}

export function legacy(options?: YaysonOptions): LegacyYaysonResult {
  const { Presenter, Adapter } = yaysonFactory(options)
  return {
    Store: createLegacyStore(),
    Presenter: createLegacyPresenter(Presenter),
    Adapter,
  }
}

// Export legacy as 'yayson' for backwards compatibility:
// const { yayson } = require('yayson/legacy')
export { legacy as yayson }

export default legacy
export { createLegacyStore }
