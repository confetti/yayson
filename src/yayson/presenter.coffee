_ = require 'lodash'
Q = require 'q'

class Presenter
  name: 'object'
  serialize: {}

  constructor: (scope = {}) ->
    @scope = scope

  pluralName: ->
    @plural || @name + 's'

  links: ->

  serialize: ->

  attributes: (instance) ->
    return null unless instance
    attributes = _.clone instance.get()
    serialize = @serialize()
    for key of serialize
      data = attributes[key]
      unless data?
        id = attributes[key + 'Id']
        attributes[key] = id if id?
      else if _.isArray data
        attributes[key] = data.map (obj) -> obj.id
      else
        attributes[key] = data.id
    attributes

  relations: (scope, instance) ->
    scope.links ||= {}
    serialize = @serialize()
    for key of serialize
      factory = serialize[key] || throw new Error("Presenter for #{key} in #{@name} is not defined")
      # Old code keep, until sure that it isn't needed
      # data = instance.get(key)
      # continue unless data?
      # factory = serialize[key]
      presenter = new factory(scope)

      data = instance.get(key)
      presenter.toJSON data, defaultPlural: true if data?

      name = if scope[@pluralName()]? then @pluralName() else @name
      keyName = if scope[presenter.pluralName()]? then presenter.pluralName() else presenter.name
      scope.links["#{name}.#{key}"] =
        type: keyName

  toJSON: (instanceOrCollection, options = {}) ->
    if _.isArray instanceOrCollection
      collection = instanceOrCollection
      @scope[@pluralName()] ||= []
      collection.forEach (instance) =>
        @toJSON instance
    else
      instance = instanceOrCollection
      added = true
      attrs = @attributes instance
      attrs.links = links if links = @links()
      # If eg x.image already exists
      if @scope[@name] && !@scope[@pluralName()]
        if @scope[@name].id != attrs.id
          @scope[@pluralName()] = [@scope[@name]]
          delete @scope[@name]
          @scope[@pluralName()].push attrs
        else
          added = false

      # If eg x.images already exists
      else if @scope[@pluralName()]
        unless _.any(@scope[@pluralName()], (i) -> i.id == attrs.id)
          @scope[@pluralName()].push attrs
        else
          added = false
      else if options.defaultPlural
        @scope[@pluralName()] = [attrs]
      else
        @scope[@name] = attrs

      @relations @scope, instance if added
    @scope

  render: (instanceOrCollection) ->
    if Q.isPromise(instanceOrCollection)
      instanceOrCollection.then (data) => @toJSON data
    else
      @toJSON instanceOrCollection

  @toJSON: ->
    (new this).toJSON arguments...

  @render: ->
    (new this).render arguments...


module.exports = Presenter

