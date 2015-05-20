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
      return null unless instance
      attributes = utils.clone adapter.get instance
      serialize = @serialize()
      for key of serialize
        data = attributes[key]
        unless data?
          id = attributes[key + 'Id']
          attributes[key] = id if id?
        else if data instanceof Array
          attributes[key] = data.map (obj) -> obj.id
        else
          attributes[key] = data.id
      attributes

    relations: (scope, instance) ->
      serialize = @serialize()
      for key of serialize
        factory = serialize[key] || throw new Error("Presenter for #{key} in #{@type} is not defined")
        presenter = new factory(scope)

        data = adapter.get instance, key
        presenter.toJSON data, defaultPlural: true if data?

        name = @type
        keyName = presenter.type
        scope.links ||= {}
        scope.links["#{name}.#{key}"] =
          type: keyName

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
          id: @id instanc
          type: @type
          attributes: @attributes instance
        links = @links()
        model.links = links if links?

        if @scope.data?
          unless utils.any(@scope.data, (i) -> i.id == model.id)
            @scope.data.push model
          else
            added = false
        else if options.defaultPlural
          @scope.data = [model]
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

