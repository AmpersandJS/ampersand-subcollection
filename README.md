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

## the options object

The main options object can be passed on init or updated later as a whole using the `.configure` method. Or individual filter/sorting options can be modified.

The main options are as follows:

```javascript
{
    where: {
        modelPropertyName: 'value it should be',
        thereCanBe: 'many of these' 
    },
    // A function that should return true/false
    // when given a model. You should also set
    // watched properties if you use custom filter
    // functions
    filter: function (model) {
        return model.isAwesome;
    },
    // same as above but in array form
    filters: [
        function (model) { ... },
        function (model) { ... }
    ],
    // If you specify custom filter functions
    // and don't identify which properties you 
    // care about in the function, your subcollection
    // won't magically update if you change a property
    // on an object that would add/remove it from your
    // sub collection.
    watched: ['isAwesome'],
    // You can also specify a limit
    // this is super useful for paging
    limit: 50,
    // ...and an offset. Starting index
    // for paging.
    offset: 10,
}
```

## credits

If you like this follow [@HenrikJoreteg](http://twitter.com/henrikjoreteg) on twitter.

## license

MIT

