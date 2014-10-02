expect = require('chai').expect

testUtils = (utils) ->
  it 'should find element', ->
    num = utils.find [1,2,3], (n) -> n == 2

    expect(num).to.equal 2

  it 'should not find element', ->
    num = utils.find [1,2,3], (n) -> n == 8

    expect(num).to.equal undefined

  it 'should filter values', ->
    evens = utils.filter [1,2,3,4], (n) -> n % 2 == 0

    expect(evens).to.deep.equal [2,4]

  it 'should evaluate if any element', ->
    anyEvens = utils.any [1,2,3,4], (n) -> n % 2 == 0

    expect(anyEvens).to.be.true

  it 'should clone an object', ->
    obj = {a: 1}
    obj2 = utils.clone obj

    expect(obj).not.to.equal obj2
    expect(obj.a).to.equal obj2.a

  it 'should parse object values', ->
    obj = {a: 1, b: 2}
    values = utils.values obj

    expect(values).to.deep.equal [1,2]


describe 'utils without optional dependencies', ->
  utils = require('../../src/yayson/utils')()
  testUtils utils

describe 'utils with optional dependencies', ->
  Q = require 'q'
  _ = require 'lodash'
  utils = require('../../src/yayson/utils')(_, Q)
  testUtils utils


