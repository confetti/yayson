Adapter = require '../adapter'

class SequelizeAdapter extends Adapter
  @get: (model, key) ->
    model.get(key) if model?

module.exports = SequelizeAdapter
