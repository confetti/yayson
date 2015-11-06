# YAYSON

A library for serializing and reading [JSON API](http://jsonapi.org) data in JavaScript. As of 2.0.0 YAYSON aims to support JSON API version 1.

## Installing

Install yayson by running:

```
$ npm install yayson --save
```

## Presenting data

A basic `Presenter` can look like this:

```coffee
  {Presenter} = require('yayson')(adapter: 'default')

  class ItemsPresenter extends Presenter
    type: 'items'

  item =
    id: 5
    name: 'First'

  ItemsPresenter.render(item)
```

This would produce:

```javascript
{
  data: {
    id: 5,
    type: 'items',
    attributes: {
      id: 5,
      name: 'First'
    }
  }
}
```

It also works with arrays, so if you send an array to render, "data" will
be an array.

A bit more advanced example:

```coffee
  {Presenter} = require('yayson')(adapter: 'default')

  class ItemsPresenter extends Presenter
    type: 'items'

    attributes: ->
      attrs = super
      attrs.start = moment.utc(attrs.start).toDate()
      attrs

    relationships: ->
      event: EventsPresenter

  ItemsPresenter.render(item)
```

In JavaScript this would be done as:

```javascript

var Presenter = require('yayson')().Presenter;

var ItemsPresenter = function () { Presenter.call(this); }
ItemsPresenter.prototype = new Presenter();

ItemsPresenter.prototype.type = 'items'

ItemsPresenter.prototype.attributes = function() {
  var attrs = Presenter.prototype.attributes.apply(this, arguments);

  attrs.start = moment.utc(attrs.start).toDate();
  return attrs;
}

ItemsPresenter.prototype.relationships = function() {
  return {
    event: EventsPresenter
  }
}

ItemsPresenter.render(item)
```

### Sequelize support

By default it is set up to handle standard JS objects. You can also make
it handle Sequelize.js models like this:

```coffee
{Presenter} = require('yayson')(adapter: 'sequelize')

```

Take a look at the SequelizeAdapter if you want to extend YAYSON to your ORM. Pull requests are welcome. :)

### Metadata

You can add metadata to the top level object.

``` coffee
  ItemsPresenter.render(items, meta: count: 10)
```

This would produce:

```javascript
{
  meta: {
    count: 10
  }
  data: {
    id: 5,
    type: 'items',
    attributes: {
      id: 5,
      name: 'First'
    }
  }
}
```

## Parsing data

You can use a `Store` can like this:

```coffee
    {Store} = require('yayson')()
    store = new Store()

    adapter.get(path: '/events/' + id).then (data) ->
      event = store.sync(data)
```

This will give you the parsed event with all its relationships.


## Use in the browser

Recommended way is to use it via [webpack](https://github.com/webpack/webpack) or similar build system wich lets you just require the package as usual.

If you just want to try it out, copy the file `dist/yayson-standalone.js` to your project. Then simply include it:
```html
    <script src="./lib/yayson-standalone.js"></script>
```
Then you can `var yayson = yayson()` use the `yayson.Presenter` and `yayson.Store` as usual. 

### Browser support

#### Tested
- Chrome
- Firefox
- Safari
- Safari iOS

#### Untested, but should work
- IE 9+
- Android
