# YAYSON

A library for serializing and reading [JSON API](http://jsonapi.org) data in JavaScript.

As of 2.0.0 YAYSON aims to support JSON API version 1. In version 3.0.0 we now support native JavaScript classes.

[![NPM](https://nodei.co/npm/yayson.png?downloads=true)](https://nodei.co/npm/yayson/)


## Installing

Install yayson by running:

```

$ npm i yayson
```

## Presenting data

A basic `Presenter` can look like this:

```javascript


  const Presenter = require('yayson')({
    adapter: 'default'
  }).Presenter;

  class ItemsPresenter extends Presenter {};
  ItemsPresenter.prototype.type = 'items';

  var item = {
    id: 5,
    name: 'First'
  };

  ItemsPresenter.render(item);
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


```javascript




var Presenter = require('yayson')().Presenter;

class ItemsPresenter extends Presenter {
  attributes() {
    var attrs = super.attributes(...arguments);
    attrs.start = moment.utc(attrs.start).toDate();
    return attrs;
  }

  relationships() {
    return {
      event: EventsPresenter
    }
  }
};
ItemsPresenter.prototype.type = 'items'


ItemsPresenter.render(item)
```

### Sequelize support

By default it is set up to handle standard JS objects. You can also make
it handle Sequelize.js models like this:

```javascript

{Presenter} = require('yayson')({adapter: 'sequelize'})

```

You can also define your own adapter globally:

```javascript

{Presenter} = require('yayson')(adapter: {
  id: function(model){ return 'omg' + model.id},
  get: function(model, key){ return model[key] }
})

```

Or at Presenter level:

```javascript

ItemPresenter.adapter = {
  id: function(model){ return 'omg' + model.id},
  get: function(model, key){ return model[key] }
}
```

Take a look at the SequelizeAdapter if you want to extend YAYSON to your ORM. Pull requests are welcome. :)

### Metadata

You can add metadata to the top level object.

``` javascript

  ItemsPresenter.render(items, {meta: count: 10})
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

```javascript

    const {Store} = require('yayson')();
    const store = new Store();

    adapter.get({path: '/events/' + id}).then(function(data) {
      let event;
      return event = store.sync(data);
    });
```

This will give you the parsed event with all its relationships.


## Use in the browser

Recommended way is to use it via [webpack](https://github.com/webpack/webpack) or similar build system wich lets you just require the package as usual.

If you just want to try it out, copy the file `dist/yayson.js` to your project. Then simply include it:
```html


    <script src="./lib/yayson.js"></script>
```
Then you can `var yayson = window.yayson()` use the `yayson.Presenter` and `yayson.Store` as usual.

### Browser support

#### Tested
- Chrome
- Firefox
- Safari
- Safari iOS

#### Untested, but should work
- IE 11
- Android
