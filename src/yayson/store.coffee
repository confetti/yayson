
module.exports = (utils) ->

  class Record
    constructor: (options) ->
      @type = options.type
      @data = options.data

  class Store
    constructor: (options) ->
      @records = []
      @relations = {}
      @types = options.types || {}

    toModel: (rec, type, models) ->
      model = utils.clone rec.data
      models[type][model.id] ||= model

      relations = @relations[type]
      for attribute, relationType of relations
        model[attribute] = if model[attribute] instanceof Array
          model[attribute].map (id) => @find relationType, id, models
        else
          @find relationType, model[attribute], models

      model

    setupRelations: (links) ->
      for key, value of links
        [type, attribute] = key.split '.'
        type = @types[type] || type
        @relations[type] ||= {}
        @relations[type][attribute] = @types[value.type] || value.type

    findRecord: (type, id) ->
      utils.find @records, (r) ->
        r.type == type && r.data.id == id

    findRecords: (type) ->
      utils.filter @records, (r) ->
        r.type == type

    retrive: (type, data) ->
      @sync data
      id = data[type].id
      @find(type, id)

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
      type = @types[type] || type

      remove = (record) =>
        index = @records.indexOf record
        @records.splice(index, 1) unless index < 0

      if id?
        remove @findRecord(type, id)
      else
        records = @findRecords type
        records.forEach remove


    sync: (data) ->
      @setupRelations data.links

      for name of data
        continue if name == 'meta' || name == 'links'

        value = data[name]

        add = (d) =>
          type = @types[name] || name
          @remove type, d.id
          @records.push new Record(type: type, data: d)

        if value instanceof Array
          value.forEach add
        else
          add value



