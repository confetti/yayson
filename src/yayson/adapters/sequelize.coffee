
SequelizeAdapter =
  get: (model, key) ->
    model.get(key)

module.exports = SequelizeAdapter
