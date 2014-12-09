
SequelizeAdapter =
  get: (model, key) ->
    model.get(key) if model?

module.exports = SequelizeAdapter
