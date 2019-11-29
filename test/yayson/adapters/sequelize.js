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

const SequelizeAdapter = require('../../../src/yayson/adapters/sequelize.coffee');

describe('SequelizeAdapter', function() {
  beforeEach(function() {});

  it('should get all object properties', function() {
    const model = { get() {
      return {name: 'Abraham'};
    }
  };

    const attributes = SequelizeAdapter.get(model);
    return expect(attributes.name).to.eq('Abraham');
  });

  it('should get object property', function() {
    let args = null;
    const model = { get() {
      args = arguments;
      return 'Abraham';
    }
  };

    const name = SequelizeAdapter.get(model, 'name');

    expect(name).to.eq('Abraham');
    return expect(args[0]).to.eq('name');
  });

  return it('should get the id', function() {
    const model = {
      get(attr) {
        expect(attr).to.eq('id');
        return 5;
      }
    };

    const id = SequelizeAdapter.id(model);
    return expect(id).to.eq('5');
  });
});
