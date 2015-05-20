module.exports = (utils, adapter) ->
  class Presenter
    @adapter: adapter
    type: 'objects'

    constructor: (scope = {}) ->
      @scope = scope

    id: (instance) ->
      adapter.id instance

    links: ->

    serialize: ->

    attributes: (instance) ->
      return null unless instance?
      attributes = utils.clone adapter.get instance
      serialize = @serialize()
      for key of serialize
        delete attributes[key]
      attributes

    relations: (scope, instance) ->
      serialize = @serialize()
      for key of serialize
        factory = serialize[key] || throw new Error("Presenter for #{key} in #{@type} is not defined")
        presenter = new factory(scope)

        data = adapter.get instance, key
        presenter.toJSON data, include: true if data?

    relationships: (instance) ->
      return null unless instance?
      serialize = @serialize()
      relationships = null
      for key of serialize
        data = adapter.get instance, key
        presenter = serialize[key]
        relationships ||= {}
        relationships[key] ||= {}
        relationships[key].linkage = if data instanceof Array
          data.map (d) ->
            id: adapter.id d
            type: presenter::type
        else
          id: adapter.id data
          type: presenter::type
      relationships


    toJSON: (instanceOrCollection, options = {}) ->
      @scope.data ||= null
      return @scope unless instanceOrCollection?

      if instanceOrCollection instanceof Array
        collection = instanceOrCollection
        @scope.data ||= []
        collection.forEach (instance) =>
          @toJSON instance
      else
        instance = instanceOrCollection
        added = true
        model  =
          id: @id instance
          type: @type
          attributes: @attributes instance
        relationships = @relationships instance
        model.relationships = relationships if relationships?

        links = @links()
        model.links = links if links?

        if options.include
          @scope.included ||= []
          unless utils.any(@scope.included.concat(@scope.data), (i) -> i.id == model.id)
            @scope.included.push model
          else
            added = false
        else if @scope.data?
          unless utils.any(@scope.data, (i) -> i.id == model.id)
            @scope.data.push model
          else
            added = false
        else
          @scope.data = model

        @relations @scope, instance if added
      @scope

    render: (instanceOrCollection) ->
      if utils.isPromise(instanceOrCollection)
        instanceOrCollection.then (data) => @toJSON data
      else
        @toJSON instanceOrCollection

    @toJSON: ->
      (new this).toJSON arguments...

    @render: ->
      (new this).render arguments...


  module.exports = Presenter

