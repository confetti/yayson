module.exports = (utils, adapter) ->
  class Presenter
    buildLinks = (link) ->
      return unless link?
      if link.self? || link.related?
        link
      else
        self: link

    @adapter: adapter
    type: 'objects'

    constructor: (scope = {}) ->
      @scope = scope

    id: (instance) ->
      @constructor.adapter.id instance

    selfLinks: (instance) ->

    links: ->

    relationships: ->

    attributes: (instance) ->
      return null unless instance?
      attributes = utils.clone @constructor.adapter.get instance
      delete attributes['id']
      delete attributes['type']

      relationships = @relationships()
      for key of relationships
        delete attributes[key]
      attributes

    includeRelationships: (scope, instance) ->
      relationships = @relationships()
      for key of relationships
        factory = relationships[key] || throw new Error("Presenter for #{key} in #{@type} is not defined")
        presenter = new factory(scope)

        data = @constructor.adapter.get instance, key
        presenter.toJSON data, include: true if data?

    buildRelationships: (instance) ->
      return null unless instance?
      rels = @relationships()
      links = @links(instance) || {}
      relationships = null
      for key of rels
        data = @constructor.adapter.get instance, key
        presenter = rels[key]
        buildData = (d) =>
          data = 
            id: @constructor.adapter.id d
            type: presenter::type
        build = (d) =>
          rel = {}
          if d?
            rel.data = buildData(d)
          if links[key]?
            rel.links = buildLinks links[key]
          else unless d?
            rel.data = null
          rel
        relationships ||= {}
        relationships[key] ||= {}
        if data instanceof Array
          relationships[key].data =  data.map buildData
          if links[key]?
            relationships[key].links = buildLinks links[key]
        else
          relationships[key]= build data
      relationships

    buildSelfLink: (instance) ->
      buildLinks @selfLinks(instance)

    toJSON: (instanceOrCollection, options = {}) ->
      @scope.meta = options.meta if options.meta?
      @scope.data ||= null

      return @scope unless instanceOrCollection?

      if instanceOrCollection instanceof Array
        collection = instanceOrCollection
        @scope.data ||= []
        collection.forEach (instance) =>
          @toJSON instance, options
      else
        instance = instanceOrCollection
        added = true
        model  =
          id: @id instance
          type: @type
          attributes: @attributes instance
        relationships = @buildRelationships instance
        model.relationships = relationships if relationships?
        links = @buildSelfLink instance
        model.links = links if links?

        if options.include
          @scope.included ||= []
          unless utils.any(@scope.included.concat(@scope.data), (i) ->
            i.id == model.id && i.type == model.type
          )
            @scope.included.push model
          else
            added = false
        else if @scope.data?
          unless @scope.data instanceof Array and utils.any(@scope.data, (i) -> i.id == model.id)
            @scope.data.push model
          else
            added = false
        else
          @scope.data = model

        @includeRelationships @scope, instance if added
      @scope

    render: (instanceOrCollection, options) ->
      if utils.isPromise(instanceOrCollection)
        instanceOrCollection.then (data) => @toJSON data, options
      else
        @toJSON instanceOrCollection, options

    @toJSON: ->
      (new this).toJSON arguments...

    @render: ->
      (new this).render arguments...


  module.exports = Presenter
