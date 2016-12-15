Adapter = require '../adapter'

class SequelizeAdapter extends Adapter
  @get: (model, key) ->
    model.get(key) if model?
  @type: (model) ->
    return model.Model.getTableName()
module.exports = SequelizeAdapter
