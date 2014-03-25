# ampersand-subcollection

Filtered view of a collection that emits events like a collection.

<!-- starthide -->
Part of the [Ampersand.js toolkit](http://ampersandjs.com) for building clientside applications.
<!-- endhide -->

## browser support

[![browser support](https://ci.testling.com/ampersandjs/ampersand-subcollection.png)
](https://ci.testling.com/ampersandjs/ampersand-subcollection)

## install

```
npm install ampersand-subcollection
```

## example

```javascript
var WidgetCollection = require('./mycollection');
var SubCollection = require('ampersand-subcollection');


var widgets = new WidgetCollection();

widgets.fetch();

// this will create a collection-like object
// that will only include models that match
// the `where` filters.
// It will be sorted by the comparator
// independent of base collection order
var favoriteWidgets = new SubCollection({
    collection: widgets,
    where: {
        awesome: true
    },
    comparator: function (model) {
        return model.rating;
    }
});
```

## credits

If you like this follow [@HenrikJoreteg](http://twitter.com/henrikjoreteg) on twitter.

## license

MIT

