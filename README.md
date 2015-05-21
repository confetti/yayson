# YAYSON

A library for serializing and reading JSON API standardized data in JavaScript.


## Presenting data

A basic `Presenter` can look like this:

```coffee
  {Presenter} = require('yayson')(adapter: 'default')

  class ItemsPresenter extends Presenter
    type: 'items'

    attributes: ->
      attrs = super
      attrs.start = moment.utc(attrs.start).toDate()
      attrs

    relationships: ->
      event: EventPresenter

  presenter = new ItemPresenter()
  presenter.render(item)
```

In JavaScript this would be done as:

```javascript

var Presenter = require('yayson')().Presenter;

var ItemPresenter = function () { Presenter.call(this); }
ItemPresenter.prototype = new Presenter();

ItemPresenter.prototype.type = 'item'

ItemPresenter.prototype.attributes = function() {
  var attrs = Presenter.prototype.attributes.apply(this, arguments);

  attrs.start = moment.utc(attrs.start).toDate();
  return attrs;
}

ItemPresenter.prototype.relationships = function() {
  return {
    event: EventPresenter
  }
}

var presenter = new ItemPresenter()
presenter.render(item)
```

By default it is set up to handle standard JS objects. You can also make
it handle Sequalize.js models like this:

```coffee
{Presenter} = require('yayson')(adapter: 'sequelize')

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
Chrome
Firefox
Safari
Safari iOS

#### Untested, but should work
IE 9+
Android


