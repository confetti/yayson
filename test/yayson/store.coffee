expect = require('chai').expect

Store = require('../../src/yayson.coffee').Store

describe 'Store', ->

  beforeEach ->
    @store = new Store
    @store.records = []
    @store.relations = {}


  it 'should store an event', ->
    @store.sync {'event': {id: 1, name: 'Demo'}}
    event = @store.find 'event', 1
    expect(event.name).to.equal 'Demo'


  it 'should populate relations', ->
    @store.sync
      links:
        "events.ticketBatches": type: "ticketBatches"
        "events.images": type: "images"
        "events.organisers": type: "organisers"
        "organisers.image": type: "images"
        "events.speakers": type: "speakers"
        "speakers.image": type: "images"

    expect(@store.relations.event.images).to.equal 'image'
    expect(@store.relations.event.organisers).to.equal 'organiser'
    expect(@store.relations.event.speakers).to.equal 'speaker'
    expect(@store.relations.organiser.image).to.equal 'image'
    expect(@store.relations.speaker.image).to.equal 'image'

  it 'should handle circular relations', ->
    @store.sync
      links:
        "event.images": type: "images"
        "images.event": type: "event"
      event: {id: 1, name: 'Demo', images: [2]}
      images: [
        {id: 2, event: 1}
      ]
    event = @store.find 'event', 1
    expect(event.name).to.equal 'Demo'

  it 'should return a event with all associated objects', ->
    @store.sync
      links:
        "events.ticketBatches": type: "ticketBatches"
        "events.images": type: "images"
        "events.organisers": type: "organisers"
        "organisers.image": type: "images"
        "events.speakers": type: "speakers"
        "speakers.image": type: "images"
      ticketBatches: [ { id: 1, name: "Early bird", event: 1 }, { id: 2, name: "Regular", event: 1 } ]
      images: [
        { id: 1, type: "logo", event: 1 }
        { id: 2, type: "organise", event: 1 }
        { id: 3, type: "organise", event: 1 }
        { id: 4, type: "organiser", event: 1 }
        { id: 5, type: "speaker", event: 1 }
      ]
      organisers: [
        { id: 3, firstName: "Jonny", event: 1, image: 2 }
        { id: 2, firstName: "Johannes", event: 1, image: 3 }
        { id: 1, firstName: "Martina", event: 1, image: 4 }
      ]
      speakers: [ { id: 1, firstName: "Ellen", event: 1, image: 5 } ]
      event: { id: 1, name: "Nordic.js", slug: "nordicjs", ticketBatches: [1, 2], images: [1], organisers: [3,2,1], speakers: [1] }

    event = @store.find 'event', 1
    expect(event.ticketBatches.length).to.equal 2
    expect(event.organisers.length).to.equal 3
    expect(event.speakers.length).to.equal 1
    expect(event.speakers[0].image.id).to.equal 5






