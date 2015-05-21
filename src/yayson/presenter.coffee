module.exports = (utils, adapter) ->
  class Presenter
    @adapter: adapter
    type: 'objects'

    constructor: (scope = {}) ->
      @scope = scope

    id: (instance) ->
      adapter.id instance

    selfLink: (instance) ->

    links: ->

    relationships: ->

    attributes: (instance) ->
      return null unless instance?
      attributes = utils.clone adapter.get instance
      relationships = @relationships()
      for key of relationships
        delete attributes[key]
      attributes

    includeRelationships: (scope, instance) ->
      relationships = @relationships()
      for key of relationships
        factory = relationships[key] || throw new Error("Presenter for #{key} in #{@type} is not defined")
        presenter = new factory(scope)

        data = adapter.get instance, key
        presenter.toJSON data, include: true if data?

    buildRelationships: (instance) ->
      return null unless instance?
      rels = @relationships()
      relationships = null
      for key of rels
        data = adapter.get instance, key
        presenter = rels[key]
        build = (d) ->
          id: adapter.id d
          type: presenter::type
        relationships ||= {}
        relationships[key] ||= {}
        relationships[key].data = if data instanceof Array
          data.map build
        else
          build data
      relationships

    buildLinks: (instance) ->
      link = @selfLink(instance)
      return unless link?
      if link.self? || link.related?
        link
      else
        self: link

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
        relationships = @buildRelationships instance
        model.relationships = relationships if relationships?
        links = @buildLinks instance
        model.links = links if links?

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

        @includeRelationships @scope, instance if added
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

