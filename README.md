# YAYSON

A library for serializing and reading JSON API standardized data in JavaScript. As of 2.0.0-beta.1 YAYSON respects JSON API Release candidate 4.

## Installing

Install yayson by running:

```
$ npm install yayson --pre --save
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

By default it is set up to handle standard JS objects. You can also make
it handle Sequalize.js models like this:

```coffee
{Presenter} = require('yayson')(adapter: 'sequelize')

```

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

Copy the file `dist/yayson.js` to your project. Then simply include it:
```html
    <script src="./lib/yayson.js"></script>
```
Then you can `var yayson = require('yayson')()` use the `yayson.Presenter` and `yayson.Store` as usual. IN THE BROWSER!

### Browser support

#### Tested
- Chrome
- Firefox
- Safari
- Safari iOS

#### Untested, but should work
- IE 9+
- Android


