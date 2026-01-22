/**
 * Build verification tests for CommonJS imports
 * Run with: node test/build.test.cjs
 */

const assert = require('assert')

async function testCJS() {
  console.log('Testing CommonJS imports...')

  // Test yayson main entry
  const yaysonModule = require('../build/yayson.cjs')
  assert.strictEqual(typeof yaysonModule.yayson, 'function', 'yayson should be a function')
  assert.strictEqual(typeof yaysonModule.createStore, 'function', 'createStore should be a function')
  assert.strictEqual(typeof yaysonModule.createPresenter, 'function', 'createPresenter should be a function')
  assert.strictEqual(typeof yaysonModule.createLegacyStore, 'function', 'createLegacyStore should be a function')
  assert.strictEqual(typeof yaysonModule.Adapter, 'function', 'Adapter should be a function')
  assert.strictEqual(typeof yaysonModule.SchemaAdapter, 'function', 'SchemaAdapter should be a function')

  // Test yayson() returns expected shape
  const { Store, Presenter, Adapter } = yaysonModule.yayson()
  assert.strictEqual(typeof Store, 'function', 'yayson().Store should be a function')
  assert.strictEqual(typeof Presenter, 'function', 'yayson().Presenter should be a function')
  assert.strictEqual(typeof Adapter, 'function', 'yayson().Adapter should be a function')

  console.log('  yayson CJS imports OK')

  // Test legacy entry
  const legacyModule = require('../build/legacy.cjs')
  assert.strictEqual(typeof legacyModule.legacy, 'function', 'legacy should be a function')
  assert.strictEqual(typeof legacyModule.createLegacyStore, 'function', 'createLegacyStore should be a function')

  // Test yayson alias for backwards compatibility
  assert.strictEqual(typeof legacyModule.yayson, 'function', 'yayson should be exported from legacy')
  assert.strictEqual(legacyModule.yayson, legacyModule.legacy, 'yayson should equal legacy')

  // Test legacy() returns expected shape
  const legacyResult = legacyModule.legacy()
  assert.strictEqual(typeof legacyResult.Store, 'function', 'legacy().Store should be a function')
  assert.strictEqual(typeof legacyResult.Presenter, 'function', 'legacy().Presenter should be a function')
  assert.strictEqual(typeof legacyResult.Adapter, 'function', 'legacy().Adapter should be a function')

  // Test backwards compatible pattern: const { yayson } = require('yayson/legacy')
  const { yayson } = legacyModule
  const { Store: BackwardsStore } = yayson({ adapter: 'default' })
  assert.strictEqual(typeof BackwardsStore, 'function', 'yayson({ adapter }) should return Store')

  // Test createLegacyStore works
  const LegacyStore = legacyModule.createLegacyStore()
  const store = new LegacyStore()
  store.sync({ event: { id: '1', name: 'Test' } })
  const event = store.find('event', '1')
  assert.strictEqual(event.id, '1', 'Store should find event by id')
  assert.strictEqual(event.name, 'Test', 'Store should preserve event name')

  console.log('  legacy CJS imports OK')
}

async function testESM() {
  console.log('Testing ESM imports...')

  // Test yayson main entry
  const yaysonModule = await import('../build/yayson.mjs')
  assert.strictEqual(typeof yaysonModule.yayson, 'function', 'yayson should be a function')
  assert.strictEqual(typeof yaysonModule.default, 'function', 'default export should be a function')
  assert.strictEqual(yaysonModule.default, yaysonModule.yayson, 'default should equal named yayson')
  assert.strictEqual(typeof yaysonModule.createStore, 'function', 'createStore should be a function')
  assert.strictEqual(typeof yaysonModule.createLegacyStore, 'function', 'createLegacyStore should be a function')

  console.log('  yayson ESM imports OK')

  // Test legacy entry
  const legacyModule = await import('../build/legacy.mjs')
  assert.strictEqual(typeof legacyModule.legacy, 'function', 'legacy should be a function')
  assert.strictEqual(typeof legacyModule.default, 'function', 'default export should be a function')
  assert.strictEqual(legacyModule.default, legacyModule.legacy, 'default should equal named legacy')
  assert.strictEqual(typeof legacyModule.createLegacyStore, 'function', 'createLegacyStore should be a function')

  // Test yayson alias
  assert.strictEqual(typeof legacyModule.yayson, 'function', 'yayson should be exported from legacy')
  assert.strictEqual(legacyModule.yayson, legacyModule.legacy, 'yayson should equal legacy')

  console.log('  legacy ESM imports OK')
}

async function main() {
  try {
    await testCJS()
    await testESM()
    console.log('\nAll build tests passed!')
    process.exit(0)
  } catch (error) {
    console.error('\nBuild test failed:', error.message)
    process.exit(1)
  }
}

main()
