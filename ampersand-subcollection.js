/*$AMPERSAND_VERSION*/
var Events = require('ampersand-events');
var classExtend = require('ampersand-class-extend');
var lodashMixins = require('ampersand-collection-lodash-mixin');
var slice = Array.prototype.slice;
var assign = require('lodash.assign');
var difference = require('lodash.difference');
var each = require('lodash.foreach');
var isArray = require('lodash.isarray');
var keys = require('lodash.keys');
var reduce = require('lodash.reduce');
var sortBy = require('lodash.sortby');
var union = require('lodash.union');
var includes = require('lodash.includes');
var isEqual = require('lodash.isequal');


function SubCollection(collection, spec) {
    this.collection = collection;
    this.models = [];
    this.configure(spec || {}, true);
    this.listenTo(this.collection, 'all', this._onCollectionEvent);
}


assign(SubCollection.prototype, Events, lodashMixins, {
    // add a filter function directly
    addFilter: function (filter) {
        this.swapFilters([filter], []);
    },

    // remove filter function directly
    removeFilter: function (filter) {
        this.swapFilters([], [filter]);
    },

    // clears filters fires events for changes
    clearFilters: function () {
        this._resetFilters();
        this._runFilters();
    },

    // Swap out a set of old filters with a set of
    // new filters
    swapFilters: function (newFilters, oldFilters) {
        var self = this;

        if (!oldFilters) {
            oldFilters = this._filters;
        } else if (!isArray(oldFilters)) {
            oldFilters = [oldFilters];
        }

        if (!newFilters) {
            newFilters = [];
        } else if (!isArray(newFilters)) {
            newFilters = [newFilters];
        }

        oldFilters.forEach(function (filter) {
            self._removeFilter(filter);
        });

        newFilters.forEach(function (filter) {
            self._addFilter(filter);
        });

        this._runFilters();
    },

    // Update sub collection config, if `clear`
    // then clear existing spec before start.
    // This takes all the same filter arguments
    // as the init function. So you can pass:
    // {
    //   where: {
    //      name: 'something'
    //   },
    //   limit: 20
    // }
    configure: function (opts, clear) {
        if (clear) this._resetFilters(clear);
        //assign(this._spec, opts);
        this._parseSpec(opts);
        this._runFilters();
    },

    // gets a model at a given index
    at: function (index) {
        return this.models[index];
    },

    // proxy `get` method to the underlying collection
    get: function (query, indexName) {
        var model = this.collection.get(query, indexName);
        if (model && this.includes(model)) return model;
    },

    // remove filter if found
    _removeFilter: function (filter) {
        var index = this._filters.indexOf(filter);
        if (index !== -1) {
            this._filters.splice(index, 1);
        }
    },

    // clear all filters, reset everything
    reset: function () {
        this.configure({}, true);
    },

    // just reset filters, no model changes
    _resetFilters: function (resetComparator) {
        this._filters = [];
        this._watched = [];
        this.limit = undefined;
        this.offset = undefined;
        if (resetComparator) this.comparator = undefined;
    },

    // internal method registering new filter function
    _addFilter: function (filter) {
        this._filters.push(filter);
    },

    // adds a property or array of properties to watch, ensures uniqueness.
    _watch: function (item) {
        this._watched = union(this._watched, isArray(item) ? item : [item]);
    },

    // removes a watched property
    _unwatch: function (item) {
        this._watched = difference(this._watched, isArray(item) ? item : [item]);
    },

    _parseSpec: function (spec) {
        if (spec.watched) this._watch(spec.watched);
        if (spec.comparator) this.comparator = spec.comparator;
        if (spec.where) {
            each(spec.where, function (value, item) {
                this._addFilter(function (model) {
                    return (model.get ? model.get(item) : model[item]) === value;
                });
            }, this);
            // also make sure we watch all `where` keys
            this._watch(keys(spec.where));
        }
        if (spec.hasOwnProperty('limit')) this.limit = spec.limit;
        if (spec.hasOwnProperty('offset')) this.offset = spec.offset;
        if (spec.filter) {
            this._addFilter(spec.filter);
        }
        if (spec.filters) {
            spec.filters.forEach(this._addFilter, this);
        }
    },

    _runFilters: function () {
        // make a copy of the array for comparisons
        var existingModels = slice.call(this.models);
        var rootModels = slice.call(this.collection.models);
        var offset = (this.offset || 0);
        var newModels, toAdd, toRemove;

        // reduce base model set by applying filters
        if (this._filters.length) {
            newModels = reduce(this._filters, function (startingArray, filterFunc) {
                return startingArray.filter(filterFunc);
            }, rootModels);
        } else {
            newModels = slice.call(rootModels);
        }

        // sort it
        if (this.comparator) newModels = sortBy(newModels, this.comparator);

        // trim it to length
        if (this.limit || this.offset) {
            // Cache a reference to the full filtered set to allow this.filtered.length. Ref: #6
            this.filtered = newModels;
            newModels = newModels.slice(offset, this.limit + offset);
        }

        // now we've got our new models time to compare
        toAdd = difference(newModels, existingModels);
        toRemove = difference(existingModels, newModels);

        // save 'em
        this.models = newModels;

        each(toRemove, function (model) {
            this.trigger('remove', model, this);
        }, this);

        each(toAdd, function (model) {
            this.trigger('add', model, this);
        }, this);

        // unless we have the same models in same order trigger `sort`
        if (!isEqual(existingModels, newModels) && this.comparator) {
            this.trigger('sort', this);
        }
    },

    _onCollectionEvent: function (eventName, model) {
        var propName = eventName.split(':')[1];
        // conditions under which we should re-run filters
        if (propName === this.comparator || includes(this._watched, propName) || includes(['add', 'remove', 'reset', 'sync'], eventName)) {
            this._runFilters();
        }
        // conditions under which we should proxy the events
        if (!includes(['add', 'remove'], eventName) && this.includes(model)) {
            this.trigger.apply(this, arguments);
        }
    }
});

Object.defineProperty(SubCollection.prototype, 'length', {
    get: function () {
        return this.models.length;
    }
});

Object.defineProperty(SubCollection.prototype, 'isCollection', {
    get: function () {
        return true;
    }
});

SubCollection.extend = classExtend;

module.exports = SubCollection;
