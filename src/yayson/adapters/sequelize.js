const Adapter = require('../adapter')

class SequelizeAdapter extends Adapter {
  static get(model, key) {
    if (model != null) {
      return model.get(key)
    }
  }

  static id(model) {
    // Retain backwards compatibility with older sequelize versions
    const pkFields =
      model.constructor && model.constructor.primaryKeys ?
        Object.keys(model.constructor.primaryKeys) :
        ['id']

    if (pkFields.length > 1) {
      throw new Error(
        'YAYSON does not support Sequelize models with composite primary keys. You can only use one column for your primary key. Currently using: ' +
          pkFields.join(',')
      )
    } else if (pkFields.length < 1) {
      throw new Error(
        'YAYSON can only serialize Sequelize models which have a primary key. This is used for the JSON:API model id.'
      )
    }

    const id = this.get(model, pkFields[0])
    if (id === undefined) {
      return id
    }
    return `${id}`
  }
}

module.exports = SequelizeAdapter
