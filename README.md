# YAYSON

A library for serializing and reading JSON API standardized data in JavaScript.


## Presenting data

A basic `Presenter` can look like this:

```coffee
  class ScheduleItemPresenter extends Presenter
    name: 'scheduleItem'

    attributes: ->
      attrs = super
      attrs.start = moment.utc(attrs.start).toDate()
      attrs

    serialize: ->
      event: presenters.event
      speaker: presenters.apps.speakers.speaker
```


## Parsing data

You can use a `Store` can like this:

```coffee

    store = new yayson.Store types:
      'events': 'event'
      'tickets': 'ticket'

    adapter.get(path: '/events/' + id).then (data) ->
      store.retrive('event', data)
```

This will give you the parsed event with all its tickets.


## Use in the browser

Copy the file `dist/yayson.js` to your project. Then simply include it:
```html
    <script src="./lib/yayson.js"></script>
```
Then you can `var yayson = require('yayson')` use the `yayson.Presenter` and `yayson.Store` as usual. IN THE BROWSER! OMG!!

### Browser support

#### Tested
Chrome
Firefox
Safari
Safari iOS

#### Untested, but should work
IE 9+
Android


