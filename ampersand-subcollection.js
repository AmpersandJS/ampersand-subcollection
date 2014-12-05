/*$AMPERSAND_VERSION*/
var _ = require('underscore');
var Events = require('backbone-events-standalone');
var classExtend = require('ampersand-class-extend');
var underscoreMixins = require('ampersand-collection-underscore-mixin');
var slice = Array.prototype.slice;


function SubCollection(collection, spec) {
    spec || (spec = {});
    this.collection = collection;
    this._reset();
    this._watched = spec.watched || [];
    this._parseFilters(spec);
    this._runFilters();
    this.listenTo(this.collection, 'all', this._onCollectionEvent);
}


_.extend(SubCollection.prototype, Events, underscoreMixins, {
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
        this._reset();
        this._runFilters();
    },

    // Swap out a set of old filters with a set of
    // new filters
    swapFilters: function (newFilters, oldFilters) {
        var self = this;

        if (!oldFilters) {
            oldFilters = this._filters;
        } else if (!_.isArray(oldFilters)) {
            oldFilters = [oldFilters];
        }

        if (!newFilters) {
            newFilters = [];
        } else if (!_.isArray(newFilters)) {
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
    // then clear existing filters before start.
    // This takes all the same filter arguments
    // as the init function. So you can pass:
    // {
    //   where: {
    //      name: 'something'
    //   },
    //   limit: 20
    // }
    configure: function (opts, clear) {
        if (clear) this._resetFilters();
        this._parseFilters(opts);
        this._runFilters();
    },

    // gets a model at a given index
    at: function (index) {
        return this.models[index];
    },

    // proxy `get` method to the underlying collection
    get: function (query, indexName) {
        var model = this.collection.get(query, indexName);
        if (model && this.contains(model)) return model;
    },

    // remove filter if found
    _removeFilter: function (filter) {
        var index = this._filters.indexOf(filter);
        if (index !== -1) {
            this._filters.splice(index, 1);
        }
    },

    // clear all filters, reset everything
    _reset: function () {
        this.models = [];
        this._resetFilters();
    },

    // just reset filters, no model changes
    _resetFilters: function () {
        this._filters = [];
        this._watched = [];
        this.limit = undefined;
        this.offset = undefined;
    },

    // internal method registering new filter function
    _addFilter: function (filter) {
        this._filters.push(filter);
    },

    // adds a property or array of properties to watch, ensures uniquness.
    _watch: function (item) {
        this._watched = _.union(this._watched, _.isArray(item) ? item : [item]);
    },

    // removes a watched property
    _unwatch: function (item) {
        this._watched = _.without(this._watched, item);
    },

    _parseFilters: function (spec) {
        if (spec.where) {
            _.each(spec.where, function (value, item) {
                this._addFilter(function (model) {
                    return (model.get ? model.get(item) : model[item]) === value;
                });
            }, this);
            // also make sure we watch all `where` keys
            this._watch(_.keys(spec.where));
        }
        if (spec.hasOwnProperty('limit')) this.limit = spec.limit;
        if (spec.hasOwnProperty('offset')) this.offset = spec.offset;
        if (spec.filter) {
            this._addFilter(spec.filter, false);
        }
        if (spec.filters) {
            spec.filters.forEach(this._addFilter, this);
        }
        if (spec.comparator) {
            this.comparator = spec.comparator;
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
            newModels = _.reduce(this._filters, function (startingArray, filterFunc) {
                return startingArray.filter(filterFunc);
            }, rootModels);
        } else {
            newModels = slice.call(rootModels);
        }

        // sort it
        if (this.comparator) newModels = _.sortBy(newModels, this.comparator);

        // trim it to length
        if (this.limit || this.offset) newModels = newModels.slice(offset, this.limit + offset);

        // now we've got our new models time to compare
        toAdd = _.difference(newModels, existingModels);
        toRemove = _.difference(existingModels, newModels);

        // save 'em
        this.models = newModels;
        
        _.each(toRemove, function (model) {
            this.trigger('remove', model, this);
        }, this);

        _.each(toAdd, function (model) {
            this.trigger('add', model, this);
        }, this);

        // if they contain the same models, but in new order, trigger sort
        if (!_.isEqual(existingModels, newModels)) {
            this.trigger('sort', this);
        }
    },

    _onCollectionEvent: function (eventName, model) {
        // conditions under which we should re-run filters
        if (_.contains(this._watched, eventName.split(':')[1]) || _.contains(['add', 'remove', 'reset', 'sync'], eventName)) {
            this._runFilters();
        }
        // conditions under which we should proxy the events
        if ((_.contains(['sync', 'invalid', 'destroy']) || eventName.indexOf('change') !== -1) && this.contains(model)) {
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
