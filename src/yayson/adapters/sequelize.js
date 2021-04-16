const Adapter = require('../adapter')

class SequelizeAdapter extends Adapter {
  static get(model, key) {
    if (model != null) {
      return model.get(key)
    }
  }
}

module.exports = SequelizeAdapter
