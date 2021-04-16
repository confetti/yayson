expect = require('chai').expect
Store = require('../../src/yayson.coffee')().Store

describe 'Store', ->

  beforeEach ->
    @store = new Store()

    @store.records = []
    @store.relations = {}


  it 'should sync an event', ->
    event = @store.sync data:
      type: 'events'
      id: 1
      attributes:
        name: 'Demo'

    expect(event.name).to.equal 'Demo'

  it 'should allow an attribute namned type', ->
    @store.sync data:
      type: 'events'
      id: 1
      attributes:
        name: 'Demo'
        type: 'party'

    event = @store.find 'events', 1
    expect(event.name).to.equal 'Demo'
    expect(event.type).to.equal 'party'

  it 'should find an event', ->
    @store.sync data:
      type: 'events'
      id: 1
      attributes:
        name: 'Demo'

    event = @store.find 'events', 1
    expect(event.id).to.equal 1
    expect(event.type).to.equal 'events'
    expect(event.name).to.equal 'Demo'

  it 'should handle relations with duplicates', ->
    @store.sync
      data:
        type: 'events'
        id: 1
        attributes:
          name: 'Demo'
        relationships:
          images:
            data: [{
              type: 'images'
              id: 2
            }]
      included: [{
        type: 'images'
        id: 2
        attributes:
          name: 'Header'
      }, {
        type: 'images'
        id: 2
        attributes:
          name: 'Header'
      }]

    event = @store.find 'events', 1
    expect(event.name).to.equal 'Demo'
    expect(event.images.length).to.equal 1

    images = @store.findAll 'images'
    expect(images.length).to.eq 1

  it 'should handle relationship elements without links attribute', ->
      @store.sync
        data:
            type: 'events'
            id: 1
            attributes:
                name: 'Demo'
            relationships:
                image:
                    data: {
                        type: 'images',
                        id: 2
                    }
       event = @store.find 'events', 1

       expect(event.name).to.equal 'Demo'
       expect(event.image).to.be.null

  it 'should handle circular relations', ->
    @store.sync
      data:
        type: 'events'
        id: 1
        attributes:
          name: 'Demo'
        relationships:
          images:
            data: [
              type: 'images'
              id: 2
            ]
      included: [
          type: 'images'
          id: 2
          attributes:
            name: 'Header'
          relationships:
            event:
              data:
                type: 'events'
                id: 1
      ]

    event = @store.find 'events', 1
    expect(event.name).to.equal 'Demo'
    expect(event.images[0].name).to.equal 'Header'
    expect(event.images[0].event.id).to.equal 1


  it 'should return a event with all associated objects', ->
    @store.sync
      data:
        type: 'events'
        id: 1
        attributes:
          name: "Nordic.js"
          slug: "nordicjs"
        relationships:
          images:
            data: [
              {type: 'images', id: 1}
              {type: 'images', id: 2}
              {type: 'images', id: 3}
            ]
          organisers:
            data: [
              {type: 'organisers', id: 1}
              {type: 'organisers', id: 2}
            ]
      included: [{
        type: 'organisers'
        id: 1
        attributes:
          firstName: 'Jonny'
        relationships:
          event:
            data: {type: 'events', id: 1}
          image:
            data: {type: 'images', id: 2}
      },{
        type: 'organisers'
        id: 2
        attributes:
          firstName: 'Martina'
        relationships:
          event:
            data: {type: 'events', id: 1}
          image:
            data: {type: 'images', id: 3}
      },{
        type: 'images'
        id: 1
        attributes:
          name: 'Header'
        relationships:
          event:
            data: {type: 'events', id: 1}
      },{
        type: 'images'
        id: 2
        attributes:
          name: 'Organiser Johannes'
        relationships:
          event:
            data: {type: 'events', id: 1}
      },{
        type: 'images'
        id: 3
        attributes:
          name: 'Organiser Martina'
        relationships:
          event:
            data: {type: 'events', id: 1}
      }]

    event = @store.find 'events', 1
    expect(event.organisers.length).to.equal 2
    expect(event.images.length).to.equal 3
    expect(event.organisers[0].image.id).to.equal 2



  it 'should remove an event', ->
    @store.sync data: [
      {id: 1, type: 'events'}
      {id: 2, type: 'events'}
    ]

    event = @store.find 'events', 1
    expect(event.id).to.eq 1
    @store.remove 'events', 1
    event = @store.find 'events', 1
    expect(event).to.eq null


  it 'should remove all events', ->
    @store.sync data: [
      {id: 1, type: 'events'}
      {id: 2, type: 'events'}
    ]

    events = @store.findAll 'events'
    expect(events.length).to.eq 2
    @store.remove 'events'
    events = @store.findAll 'events'
    expect(events).to.deep.eq []


  it 'should reset', ->
    @store.sync
      data: [{
        type: 'events'
        id: 1
        attributes:
          name: 'Demo'
        relationships:
          images:
            data: [ type: 'images', id: 2 ]
      },{
        type: 'events'
        id: 2
        attributes:
          name: 'Demo 2'
      }]
      included: [
          type: 'images'
          id: 2
          attributes:
            name: 'Header'
          relationships:
            event:
              data: {type: 'events', id: 1}
      ]

    events = @store.findAll 'events'
    images = @store.findAll 'images'
    expect(events.length).to.eq 2
    expect(images.length).to.eq 1

    @store.reset()

    events = @store.findAll 'event'
    images = @store.findAll 'image'
    expect(events).to.deep.eq []
    expect(images).to.deep.eq []


  it 'should handle circular relations', ->
    @store.sync
      data:
        type: 'events'
        id: 1
        attributes:
          name: 'Demo'
        relationships:
          images:
            links:
              self: 'http://example.com/events/1/relationships/images'

    event = @store.find 'events', 1

    expect(event.name).to.equal 'Demo'
    expect(event.images._links).to.deep.equal
        self: 'http://example.com/events/1/relationships/images'

  it 'should retain links and meta', ->
    result = @store.sync
      links:
        self: 'http://example.com/events'
        next: 'http://example.com/events?page[offset]=2'
      meta:
        name: 'top level meta data'
        value: 1
      data: [
        type: 'events'
        id: 1
        meta:
          name: 'second level meta'
          value: 2
        attributes:
          name: 'Demo'
          article:
            name: 'An Article test'
            teaser: 'this is a teaser...'
            body: 'this is an article body'
            meta:
              author: 'John Doe'
              date: '2017-06-26'
          meta:
            name: 'attribute nested meta'
            value: 3
        relationships:
          comment:
            links:
              self: 'http://example.com/events/1/relationships/comment'
              related: 'http://example.com/events/1/comment'
            data:
              type: 'comment',
              id: 2
      ]
      included: [
        type: 'comment'
        id: 2
        attributes:
          name: 'Comment'
          details:
            user: 'micha3ldavid'
            body: 'this is a comment...'
        links:
          self: 'http://example.com/comment/2'
        meta:
          author: 'John Doe'
          date: '2017-06-26'
      ]

    expect(result.meta).to.deep.equal {name: 'top level meta data', value: 1}
    expect(result[0].article.meta).to.deep.equal {author: 'John Doe', date: '2017-06-26'}
    expect(result[0].comment.meta).to.deep.equal {author: 'John Doe', date: '2017-06-26'}
    expect(result[0].comment._links).to.deep.equal {self: 'http://example.com/events/1/relationships/comment', related: 'http://example.com/events/1/comment'}
