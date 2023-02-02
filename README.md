# YAYSON

A library for serializing and reading [JSON API](http://jsonapi.org) data in JavaScript.

From version 3 we now support native JavaScript classes. YAYSON has zero dependencies and works in the browser and in node 14 and up.

[![NPM](https://nodei.co/npm/yayson.png?downloads=true)](https://nodei.co/npm/yayson/)


## Installing

Install yayson by running:

```


$ npm i yayson
```

## Presenting data

A basic `Presenter` can look like this:

```javascript
const yayson = require('yayson')
const { Presenter } = yayson()

class BikePresenter extends Presenter {
  static type = 'bikes'
}

const bike = {
  id: 5,
  name: 'Monark'
};

BikePresenter.render(bike);
```


This would produce:

```javascript



{
  data: {
    id: 5,
    type: 'bikes',
    attributes: {
      id: 5,
      name: 'Monark'
    }
  }
}
```

It also works with arrays, so if you send an array to render, "data" will
be an array.

A bit more advanced example:


```javascript

const yayson = require('yayson')
const { Presenter } = yayson()

class WheelPresenter extends Presenter {
  static type = 'wheels'

  relationships() {
    return { bike: BikePresenter }
  }
}

class BikePresenter extends Presenter {
  static type = 'bikes'
  relationships() {
    return { wheels: WheelPresenter }
  }
}


```

### Sequelize support

By default it is set up to handle standard JS objects. You can also make
it handle Sequelize.js models like this:

```javascript

const yayson = require('yayson')
{Presenter} = yayson({adapter: 'sequelize'})

```

You can also define your own adapter globally:

```javascript


const yayson = require('yayson')
{Presenter} = yayson(adapter: {
  id: function(model){ return 'omg' + model.id},
  get: function(model, key){ return model[key] }
})

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

  const data = await adapter.get({path: '/events/' + id});
  const event = store.sync(data);
```

This will give you the parsed event with all its relationships.

Its also possible to find in the synched data:


```javascript
  const event = this.store.find('events', id)

  const images = this.store.findAll('images')
```


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


## Legacy support

Earlier versions of JSON API worked a bit different from 1.0. Therefore YAYSON provides legacy presenters and stores in order to have interoperability between the versions. Its used similar to the standard presenters:

```javascript

const yayson = require('yayson/legacy')
const { Presenter } = yayson()

```


