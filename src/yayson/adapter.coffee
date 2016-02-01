
class Adapter
  @get: (model, key) ->
    return model[key] if key
    model

  @id: (model) ->
    "#{@get model, 'id'}"
  @type: (model) ->
    return model.type || "objects"
module.exports = Adapter
