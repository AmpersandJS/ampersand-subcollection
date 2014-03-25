var _ = require('underscore');
var Events = require('backbone-events-standalone');
var classExtend = require('ampersand-class-extend');
var slice = Array.prototype.slice;


function SubCollection(spec) {
    spec || (spec = {});
    this.collection = spec.collection;
    if (!this.collection) throw Error('You must pass a collection');
    this._reset();
    this.watched = spec.watched || [];
    this._parseFilters(spec);
    this._runFilters();
    this.listenTo(this.collection, 'all', this._onCollectionEvent);
}


_.extend(SubCollection.prototype, Events, {
    // update the total limit of allowed results
    setLimit: function (limit) {
        this.limit = limit;
        this._runFilters();
    },

    // update offset and fire events accordingly
    setOffset: function (offset) {
        this.offset = offset;
        this._runFilters();
    },

    // add a filter function directly
    addFilter: function (filter) {
        this._addFilter();
        this._runFilters();
    },

    // remove filter function directly
    removeFilter: function (filter) {
        this._removeFilter(filter);
        this._runFilters();
    },

    // clears filters fires events for changes
    clearFilters: function () {
        this._reset();
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
        if (clear) this._reset();
        this._parseFilters(opts);
        this._runFilters();
    },

    // gets a model at a given index
    at: function (index) {
        return this.models[index];
    },

    // remove filter if found
    _removeFilter: function () {
        var index = this.filters.indexOf(filter);
        if (index !== -1) {
            this.filters.splice(index, 1);
        }
    },

    // clear all filters, reset everything
    _reset: function () {
        this.filters = [];
        this.watched = [];
        this.models = [];
        this.limit = undefined;
        this.offset = undefined;
    },

    // internal method registering new filter function
    _addFilter: function (filter) {
        this.filters.push(filter);
    },

    // adds a property or array of properties to watch, ensures uniquness.
    _watch: function (item) {
        this.watched = _.union(this.watched, _.isArray(item) ? item : [item]);
    },

    // removes a watched property
    _unwatch: function (item) {
        this.watched = _.without(this.watched, item);
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
        if (typeof spec.limit === 'number') this.limit = spec.limit;
        if (typeof spec.offset === 'number') this.offset = spec.offset;
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
        if (this.filters.length) {
            newModels = _.reduce(this.filters, function (startingArray, filterFunc) {
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

        _.each(toRemove, function (model) {
            this.trigger('remove', model, this);
        }, this);

        _.each(toAdd, function (model) {
            this.trigger('add', model, this);
        }, this);

        // if they contain the same models, but in new order, trigger sort
        if (toAdd.length === 0 && toRemove.length === 0 && !_.isEqual(existingModels, newModels)) {
            this.trigger('sort', this);
        }

        // save 'em
        this.models = newModels;
    },

    _onCollectionEvent: function (eventName, event) {
        if (_.contains(this.watched, eventName.split(':')[1]) || _.contains(['add', 'remove'], eventName)) {
            this._runFilters();
        }
    }
});

Object.defineProperty(SubCollection.prototype, 'length', {
    get: function () {
        return this.models.length;
    }
});

SubCollection.extend = classExtend;

module.exports = SubCollection;
