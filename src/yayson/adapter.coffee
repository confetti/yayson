
class Adapter
  @get: (model, key) ->
    return model[key] if key
    model

  @id: (model) ->
    "#{@get model, 'id'}"

module.exports = Adapter
