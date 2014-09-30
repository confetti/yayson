_ = require 'lodash/dist/lodash.underscore'

TYPES =
  'events': 'event'
  'ticketBatches': 'ticketBatch'
  'images': 'image'
  'tickets': 'ticket'
  'sponsors': 'sponsor'
  'sponsorLevels': 'sponsorLevel'
  'speakers': 'speaker'
  'organisers': 'organiser'
  'payments': 'payment'

class Record
  constructor: (options) ->
    @type = options.type
    @data = options.data

class Store
  constructor: (options) ->
    @records = []
    @relations = {}

  toModel: (rec, type, models) ->
    model = _(rec.data).clone()
    models[type][model.id] ||= model

    relations = @relations[type]
    _.each relations, (relationType, attribute) =>
      if _.isArray model[attribute]
        model[attribute] = _.map model[attribute], (id) => @find relationType, id, models
      else
        model[attribute] = @find relationType, model[attribute], models

    model

  setupRelations: (links) ->
    _.each links, (value, key) =>
      [type, attribute] = key.split '.'
      type = TYPES[type] || type
      @relations[type] ||= {}
      @relations[type][attribute] = TYPES[value.type] || value.type

  findRecord: (type, id) ->
    _(@records).find (r) ->
      r.type == type && r.data.id == id

  findRecords: (type) ->
    _(@records).filter (r) ->
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
    _.values models[type]

  remove: (type, id) ->
    index = @records.indexOf(@findRecord(type, id))
    @records.splice(index, 1) unless index < 0

  sync: (data) ->

    @setupRelations data.links
    delete data.links

    for name of data
      value = data[name]
      add = (d) =>
        type = TYPES[name] || name
        @remove type, d.id
        @records.push new Record(type: type, data: d)

      if value instanceof Array
        value.forEach add
      else
        add value



module.exports = Store

