
module.exports = (utils) ->

  class Record
    constructor: (options) ->
      {@id, @type, @attributes, @relationships, @links, @meta} = options

  class Store
    constructor: (options) ->
      @reset()

    reset: ->
      @records = []
      @relations = {}

    toModel: (rec, type, models) ->

      model = utils.clone(rec.attributes) || {}
      typeAttribute = model.type if model.type

      model.id = rec.id
      model.type = rec.type
      models[type] ||= {}
      models[type][rec.id] ||= model

      if model.hasOwnProperty 'meta'
        model.attributes = {meta: model.meta};
        delete model.meta;

      if rec.meta?
        model.meta = rec.meta

      if rec.links?
        model.links = rec.links

      if rec.relationships?
        for key, rel of rec.relationships

          data = rel.data
          links = rel.links
          meta = rel.meta

          model[key] = null
          continue unless data? or links?
          resolve = ({type, id}) =>
            @find type, id, models
          model[key] = if data instanceof Array
            data.map resolve
          else if data?
            resolve data
          else
            {}

          # Model of the relation
          currentModel = model[key]

          if currentModel?
            # retain the links and meta from the relationship entry
            # use as underscore property name because the currentModel may also have a link and meta reference
            currentModel._links = links || {}
            currentModel._meta = meta || {}

      model.type = typeAttribute if typeAttribute
      model

    findRecord: (type, id) ->
      utils.find @records, (r) ->
        r.type == type && r.id == id

    findRecords: (type) ->
      utils.filter @records, (r) ->
        r.type == type

    find: (type, id, models = {}) ->
      rec = @findRecord(type, id)
      return null unless rec?
      models[type] ||= {}
      models[type][id] || @toModel(rec, type, models)

    findAll: (type, models = {}) ->
      recs = @findRecords(type)
      return [] unless recs?
      recs.forEach (rec) =>
        models[type] ||= {}
        @toModel(rec, type, models)
      utils.values models[type]

    remove: (type, id) ->
      remove = (record) =>
        index = @records.indexOf record
        @records.splice(index, 1) unless index < 0

      if id?
        remove @findRecord(type, id)
      else
        records = @findRecords type
        records.map remove

    sync: (body) ->
      sync = (data) =>
        return null unless data?
        add = (obj) =>
          {type, id} = obj
          @remove type, id
          rec = new Record(obj)
          @records.push rec
          rec

        if data instanceof Array
          data.map add
        else
          add data

      sync body.included
      recs = sync body.data

      return null unless recs?

      models = {}
      result = null;

      if recs instanceof Array
        result = recs.map (rec) =>
          @toModel rec, rec.type, models
      else
        result = @toModel recs, recs.type, models

      if body.hasOwnProperty 'links'
        result.links = body.links;

      if body.hasOwnProperty 'meta'
        result.meta = body.meta;

      result
