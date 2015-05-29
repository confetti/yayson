
module.exports = (utils) ->

  class Record
    constructor: (options) ->
      {@id, @type, @attributes, @relationships} = options

  class Store
    constructor: (options) ->
      @reset()

    reset: ->
      @records = []
      @relations = {}

    toModel: (rec, type, models) ->
      model = utils.clone(rec.attributes) || {}
      model.id = rec.id
      models[type] ||= {}
      models[type][rec.id] ||= model
      if rec.relationships?
        for key, rel of rec.relationships
          data = rel.data
          model[key] = null
          continue unless data?
          resolve = ({type, id}) =>
            @find type, id, models
          model[key] = if data instanceof Array
            data.map resolve
          else
            resolve data
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
          #@remove type, id
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
      if recs instanceof Array
        recs.map (rec) =>
          @toModel rec, rec.type, models
      else
        @toModel recs, recs.type, models





