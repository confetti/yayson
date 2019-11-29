// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

class Adapter {
  static get(model, key) {
    if (key) { return model[key]; }
    return model;
  }

  static id(model) {
    const id = this.get(model, 'id');
    if (id === undefined) {
      return id;
    }
    return `${id}`;
  }
}

module.exports = Adapter;
