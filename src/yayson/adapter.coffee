
Adapter =
  get: (model, key) ->
    return model[key] if key
    model

module.exports = Adapter
