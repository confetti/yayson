/**
 * Build verification tests for CommonJS imports
 * Run with: node test/build.test.cjs
 */

const assert = require('assert')

async function testCJS() {
  console.log('Testing CommonJS imports...')

  // Test yayson main entry
  const yayson = require('../build/yayson.cjs')
  assert.strictEqual(typeof yayson, 'function', 'yayson should be a function')

  // Test yayson() returns expected shape
  const { Store, Presenter, Adapter } = yayson()
  assert.strictEqual(typeof Store, 'function', 'yayson().Store should be a function')
  assert.strictEqual(typeof Presenter, 'function', 'yayson().Presenter should be a function')
  assert.strictEqual(typeof Adapter, 'function', 'yayson().Adapter should be a function')

  console.log('  yayson CJS imports OK')

  // Test legacy entry
  const legacy = require('../build/legacy.cjs')
  assert.strictEqual(typeof legacy, 'function', 'legacy should be a function')

  // Test legacy() returns expected shape
  const { Store: LegacyStore, Presenter: LegacyPresenter, Adapter: LegacyAdapter } = legacy()
  assert.strictEqual(typeof LegacyStore, 'function', 'legacy().Store should be a function')
  assert.strictEqual(typeof LegacyPresenter, 'function', 'legacy().Presenter should be a function')
  assert.strictEqual(typeof LegacyAdapter, 'function', 'legacy().Adapter should be a function')

  // Test Store works
  const store = new LegacyStore()
  store.sync({ event: { id: '1', name: 'Test' } })
  const event = store.find('event', '1')
  assert.strictEqual(event.id, '1', 'Store should find event by id')
  assert.strictEqual(event.name, 'Test', 'Store should preserve event name')

  console.log('  legacy CJS imports OK')

  // Test utils entry
  const utils = require('../build/utils.cjs')
  assert.strictEqual(typeof utils.Adapter, 'function', 'Adapter should be a function')
  assert.strictEqual(typeof utils.Adapter.get, 'function', 'Adapter.get should be a function')
  assert.strictEqual(typeof utils.Adapter.id, 'function', 'Adapter.id should be a function')
  assert.strictEqual(typeof utils.TYPE, 'symbol', 'TYPE should be a symbol')
  assert.strictEqual(typeof utils.LINKS, 'symbol', 'LINKS should be a symbol')
  assert.strictEqual(typeof utils.META, 'symbol', 'META should be a symbol')

  console.log('  utils CJS imports OK')
}

async function testESM() {
  console.log('Testing ESM imports...')

  // Test yayson main entry
  const yaysonModule = await import('../build/yayson.mjs')
  assert.strictEqual(typeof yaysonModule.default, 'function', 'default export should be a function')

  // Test yayson() returns expected shape
  const { Store, Presenter, Adapter } = yaysonModule.default()
  assert.strictEqual(typeof Store, 'function', 'yayson().Store should be a function')
  assert.strictEqual(typeof Presenter, 'function', 'yayson().Presenter should be a function')
  assert.strictEqual(typeof Adapter, 'function', 'yayson().Adapter should be a function')

  console.log('  yayson ESM imports OK')

  // Test legacy entry
  const legacyModule = await import('../build/legacy.mjs')
  assert.strictEqual(typeof legacyModule.default, 'function', 'default export should be a function')

  // Test legacy() returns expected shape
  const { Store: LegacyStore, Presenter: LegacyPresenter, Adapter: LegacyAdapter } = legacyModule.default()
  assert.strictEqual(typeof LegacyStore, 'function', 'legacy().Store should be a function')
  assert.strictEqual(typeof LegacyPresenter, 'function', 'legacy().Presenter should be a function')
  assert.strictEqual(typeof LegacyAdapter, 'function', 'legacy().Adapter should be a function')

  console.log('  legacy ESM imports OK')

  // Test utils entry
  const utils = await import('../build/utils.mjs')
  assert.strictEqual(typeof utils.Adapter, 'function', 'Adapter should be a function')
  assert.strictEqual(typeof utils.Adapter.get, 'function', 'Adapter.get should be a function')
  assert.strictEqual(typeof utils.Adapter.id, 'function', 'Adapter.id should be a function')
  assert.strictEqual(typeof utils.TYPE, 'symbol', 'TYPE should be a symbol')
  assert.strictEqual(typeof utils.LINKS, 'symbol', 'LINKS should be a symbol')
  assert.strictEqual(typeof utils.META, 'symbol', 'META should be a symbol')

  console.log('  utils ESM imports OK')
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
