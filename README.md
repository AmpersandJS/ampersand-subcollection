# ampersand-subcollection

Filtered subset of a collection that emits events like a collection.

Often for one part of an app you want a whole collection of models, but for another you want some sort of filterd subcollection. That's what this is for. It gives you a "pseudo collection" that behaves much like a full collections, but really is a subset.

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
var favoriteWidgets = new SubCollection(widgets, {
    where: {
        awesome: true
    },
    comparator: function (model) {
        return model.rating;
    }
});
```

## API reference

### new SubCollection(collection, [config])

* `collection` {Collection} An instance of an ampersand-collection or Backbone.Collection that contains our full set of models.
* `config` {Object} [optional] The config object that specifies whether or not a model in the base should be considered part of this subcollection.
    * `where` {Object} [optional] Object where each key is a property name of the model and the value is what you want that property to be in order for it to be included. Often used for boolean properties.
    * `filter` {Function} [optional] If you need more control than what you get from `where` you can use a filter function to determine if the model should be included. It will get called with a model and you simply return `true` or `false`.
    * `filters` {Array} [optional] If you for some reason want to pass in multiple filter functions you can do so. This can be useful in cases where you keep a reference to one that you may remove later without wanting to remove all your filtering rules. But, most of the time you would just do use `filter` and do all your logic in that one function.
    * `watched` {Array} [optional] This is an array of property names to watch for changes to in the base collection. This happens automatically if you use `where` 
    * `comparator` {Function || String} [optional] If you want to determine sort order separate from the base collection provide this argument. If you pass a string it should be the name of the property that should be used to sort by. If you pass a function, it will be passed the model and should return the value from the model that should be used to sort. If you pass a function that names two incoming arguments it will be used as a native Array.prototype.sort, where you get passed two models and return a 1, 0, -1 to specify how they compare.
    * `limit` {Number} [optional] If specified will limit the number of matched models to this maximum number. This is useful for things like pagination.
    * `offset` {Number} [optional] Similar to `limit` setting an `offset` will specify what number to start at. So you can think of `limit` as number of results per page, and `offset` being the index of the start of the current page of results.

### .configure(config, [reset])

Config can get used to update subcollection config post-init.

* `config` {Object} Same config object as what you pass to init.
* `reset` {Boolean} Default: false. Whether or not to remove all previous filter config options. If you specify `{where: {read: true}}` in the init and then do `.configure({where: {from: 'steve'}})` without passing `true` the collection will contain only read items from steve. They filters are combined by default.

### .addFilter(filterFunction)

* `filterFunction` {Function} A filter function as described above. Gets called with the model, you return `true` or `false`.

### .removeFilter(filterFunction)

* `filterFunction` {Function} If you have a reference in your code to the filter function you added, you can remove it by calling `removeFilter`.

### .clearFilters()

Removes all filter functions and resets everything. After calling this, the subcollection should have the same models as your base collection.

The only thing that does *not* get cleared is your `comparator` method if you have one.

### .swapFilters(newFilters, [oldFilters])

* `newFilters` {Function} or array of filter functions to be applied to the collection.
* `oldFilters` {Function} or array of filter functions to be removed from the collection. If `oldFilters` is undefined, then it is assumed to be the set of currently active filters.

Replaces a set of existing filter functions with a set of new filters, and does not apply the results of the new filter combination until all have been added and removed.

For example:

```javascript
.swapFilters(newFilter, []) // Same as .addFilter(newFilter)
.swapFilters([], oldFilter) // Same as .removeFilter(oldFilter)
```


### .at(index)

* `index` {Number} returns model as specified index in the subcollection.

### .length

The subcollection maintains a read-only length property that simply proxies to the array length of the models it contains.

### all the underscore methods

Since we're already depending on underscore for much of the functionality in this module, we also mixin underscore methods into the subcollection in the same way that Backbone does for collections.

This means you can just call `collection.each()` or `collection.find()` to find/filter/iterate the models in the subcollection. You can see which underscore methods are included by referencing [ampersand-collection-underscore-mixin](https://github.com/AmpersandJS/ampersand-collection-underscore-mixin).

### SubCollection.extend(mixins...)

Subcollection attaches `extend` to the constructor so if you want to add custom methods to your subcollection constructor, it's easy:

```javascript
var SubCollection = require('ampersand-subcollection');

// this exports a new constructor that includes
// the methods you passed on the prototype while
// maintaining the inheritance chain for instanceof
// checks.
module.exports = SubCollection.extend({
    myMethod: function () { ... },
    myOtherMethod: function () { ... } 
});
```

This is done by using: [ampersand-class-extend](https://github.com/AmpersandJS/ampersand-class-extend)


## changelog

- 1.4.5 fixed bug where passing the `reset` option to `configure()` wasn't working.

## credits

If you like this follow [@HenrikJoreteg](http://twitter.com/henrikjoreteg) on twitter.

## license

MIT

