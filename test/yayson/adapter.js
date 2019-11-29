// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

const {
  expect
} = require('chai');

const {
  Adapter
} = require('../../src/yayson.coffee')();

describe('Adapter', function() {
  it('should get all object properties', function() {
    const attributes = Adapter.get({name: 'Abraham'});
    return expect(attributes.name).to.eq('Abraham');
  });

  it('should get object property', function() {
    const name = Adapter.get({name: 'Abraham'}, 'name');
    return expect(name).to.eq('Abraham');
  });

  return it('should get the id', function() {
    const id = Adapter.id({id: 5});
    return expect(id).to.eq('5');
  });
});
