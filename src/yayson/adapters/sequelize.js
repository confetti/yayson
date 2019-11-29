// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Adapter = require('../adapter');

class SequelizeAdapter extends Adapter {
  static get(model, key) {
    if (model != null) { return model.get(key); }
  }
}

module.exports = SequelizeAdapter;
