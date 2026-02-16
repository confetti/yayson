import { expect } from 'chai'
import yayson from '../../src/yayson.js'
import { getType, getLinks, getMeta, getRelationshipLinks, getRelationshipMeta } from '../../src/utils.js'

const { Store } = yayson()

describe('Utils', function () {
  it('getType should return the type of a synced model', function () {
    const store = new Store()
    const [event] = store.sync({
      data: { type: 'events', id: '1', attributes: { name: 'Demo' } },
    })
    expect(getType(event)).to.equal('events')
  })

  it('getLinks should return links from a synced model', function () {
    const store = new Store()
    const [event] = store.sync({
      data: {
        type: 'events',
        id: '1',
        attributes: { name: 'Demo' },
        links: { self: 'http://example.com/events/1' },
      },
    })
    expect(getLinks(event)).to.deep.equal({ self: 'http://example.com/events/1' })
  })

  it('getLinks should return undefined when no links exist', function () {
    const store = new Store()
    const [event] = store.sync({
      data: { type: 'events', id: '1', attributes: { name: 'Demo' } },
    })
    expect(getLinks(event)).to.be.undefined
  })

  it('getMeta should return meta from a synced model', function () {
    const store = new Store()
    const [event] = store.sync({
      data: {
        type: 'events',
        id: '1',
        attributes: { name: 'Demo' },
        meta: { createdBy: 'admin' },
      },
    })
    expect(getMeta(event)).to.deep.equal({ createdBy: 'admin' })
  })

  it('getMeta should return undefined when no meta exists', function () {
    const store = new Store()
    const [event] = store.sync({
      data: { type: 'events', id: '1', attributes: { name: 'Demo' } },
    })
    expect(getMeta(event)).to.be.undefined
  })

  it('getRelationshipLinks should return relationship links', function () {
    const store = new Store()
    const [event] = store.sync({
      data: {
        type: 'events',
        id: '1',
        attributes: { name: 'Demo' },
        relationships: {
          image: {
            links: { self: 'http://example.com/events/1/relationships/image' },
            data: { type: 'images', id: '2' },
          },
        },
      },
      included: [{ type: 'images', id: '2', attributes: { url: 'img.png' } }],
    })
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- Test needs runtime property access on relationship model
    const image = (event as any).image
    expect(getRelationshipLinks(image)).to.deep.equal({
      self: 'http://example.com/events/1/relationships/image',
    })
  })

  it('getRelationshipMeta should return relationship meta', function () {
    const store = new Store()
    const [event] = store.sync({
      data: {
        type: 'events',
        id: '1',
        attributes: { name: 'Demo' },
        relationships: {
          image: {
            meta: { permission: 'read' },
            data: { type: 'images', id: '2' },
          },
        },
      },
      included: [{ type: 'images', id: '2', attributes: { url: 'img.png' } }],
    })
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- Test needs runtime property access on relationship model
    const image = (event as any).image
    expect(getRelationshipMeta(image)).to.deep.equal({ permission: 'read' })
  })
})
