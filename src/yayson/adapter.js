
class Adapter
  @get: (model, key) ->
    return model[key] if key
    model

  @id: (model) ->
    id = @get model, 'id'
    if id == undefined
      return id
    return "#{id}"

module.exports = Adapter
