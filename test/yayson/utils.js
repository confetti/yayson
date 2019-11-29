const { expect } = require('chai')

const testUtils = function(utils) {
  it('should find element', function() {
    const num = utils.find([1, 2, 3], n => n === 2)

    expect(num).to.equal(2)
  })

  it('should not find element', function() {
    const num = utils.find([1, 2, 3], n => n === 8)

    expect(num).to.equal(undefined)
  })

  it('should filter values', function() {
    const evens = utils.filter([1, 2, 3, 4], n => n % 2 === 0)

    expect(evens).to.deep.equal([2, 4])
  })

  it('should evaluate if any element', function() {
    const anyEvens = utils.any([1, 2, 3, 4], n => n % 2 === 0)

    expect(anyEvens).to.be.true
  })

  it('should clone an object', function() {
    const obj = { a: 1 }
    const obj2 = utils.clone(obj)

    expect(obj).not.to.equal(obj2)
    expect(obj.a).to.equal(obj2.a)
  })

  return it('should parse object values', function() {
    const obj = { a: 1, b: 2 }
    const values = utils.values(obj)

    expect(values).to.deep.equal([1, 2])
  })
}

describe('utils without optional dependencies', function() {
  const utils = require('../../src/yayson/utils')()
  return testUtils(utils)
})

describe('utils with optional dependencies', function() {
  const Q = require('q')
  const _ = require('lodash')
  const utils = require('../../src/yayson/utils')(_, Q)
  return testUtils(utils)
})
