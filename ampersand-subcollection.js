/*$AMPERSAND_VERSION*/
var Events = require('ampersand-events');
var _ = require('underscore');
var classExtend = require('ampersand-class-extend');
var contains = require('amp-contains');
var difference = require('amp-difference');
var each = require('amp-each');
var every = require('amp-every');
var extend = require('amp-extend');
var flatten = require('amp-flatten');
var isArray = require('amp-is-array');
var isEqual = require('amp-is-object-equal');
var keys = require('amp-keys');
var reduce = require('amp-reduce');
var underscoreMixins = require('ampersand-collection-underscore-mixin');
var slice = Array.prototype.slice;


function SubCollection(collection, spec) {
    this.collection = collection;
    this.indexes = collection.indexes;
    this._indexes = {};
    this.mainIndex = collection.mainIndex;
    this.models = []; //Our filtered, offset/limited models
    this.rootModels = []; //Cached copy of our parent's models, refreshed during filters
    this.configure(spec || {}, true);
    this.listenTo(this.collection, 'all', this._onCollectionEvent);
    this.models = [];
    this._resetIndexes();
    this.filterRun = 0;
}

extend(SubCollection.prototype, Events, underscoreMixins, {
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
        //extend(this._spec, opts);
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
        if (model && this.contains(model)) return model;
    },

    _filteredGet: function (query, indexName) {
        if (!query) return;
        var index = this._indexes[indexName || this.mainIndex];
        return index[query] ||
            index[query[this.mainIndex]] ||
            this._indexes.cid[query] ||
            this._indexes.cid[query.cid];
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
        this.filtered = undefined;
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

    // adds a property or array of properties to watch, ensures uniquness.
    _watch: function (item) {
        this._watched = flatten([this._watched, item]);
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

    _runFilters: function (model) {
        // make a copy of the array for comparisons
        var existingModels = slice.call(this.models);
        this.rootModels = slice.call(this.collection.models);
        var offset = (this.offset || 0);
        var newModels = [];
        var newIndexes = {};
        var toAdd, toRemove, indexVal, name;
        for (name in this._indexes) {
            newIndexes[name] = {};
        }

        // reduce base model set by applying filters
        if (this._filters.length) {
            newModels = _.reduce(this._filters, function (startingArray, filterFunc) {
                return startingArray.filter(filterFunc);
            }, this.rootModels);
        } else {
            newModels = slice.call(this.rootModels);
        }

/*
        // reduce base model set by applying filters
        if (this._filters.length) {
            ////console.log('filtering');
            each(this.rootModels, function (parentModel, idx) {
                this.filterRun++;
                //console.log('filtering model', parentModel.id, !!this.filtered, this.filtered);
                if (parentModel === model || !this.filtered) {
                    //console.log('new model, running filters', parentModel.id);
                    var accepted = every(this._filters, function (filter) {
                        return filter(parentModel);
                    });

                    //console.log('model was accepted?', accepted);

                    if (accepted) {
                        newModels.push(parentModel);
                        //console.log('model matches filters');
                        this._addIndex(newIndexes, parentModel);
                    }
                } else if (this._filteredGet(parentModel)) {
                    newModels.push(parentModel);
                    //console.log('model already filtered');
                    this._addIndex(newIndexes, parentModel);
                } else {
                    //console.log('model rejected');
                }
            }, this);
        } else {
            //console.log('no filters to apply');
            newModels = slice.call(this.rootModels);
            newModels.forEach(function (model) {
                this._addIndex(newIndexes, model);
            }.bind(this));
        }
*/

        // sort it
        if (this.comparator) newModels = _.sortBy(newModels, this.comparator);

        // Cache a reference to the full filtered set to allow this.filtered.length. Ref: #6
        if (this.rootModels.length) {
            this.filtered = newModels;
            this._indexes = newIndexes;
        } else {
            this.filtered = undefined;
            this._resetIndexes();
        }

        // trim it to length
        if (this.limit || this.offset) {
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
        var containsModel, shouldContainModel;

        var action = eventName;

        // conditions under which we should re-run filters

        if (
            (propName !== undefined && propName === this.comparator) ||
            contains(this._watched, propName)
        ) {
            var alreadyHave = contains(this.filtered, model);
            var accepted = every(this._filters, function (filter) {
                return filter(model);
            });

            if (!alreadyHave && accepted) {
                action = 'add';
            } else if (alreadyHave && !accepted) {
                action = 'remove';
            }
        }

        if (
            action === 'remove' ||
            action === 'reset' ||
            (action === 'add' && !contains(this.rootModels, model))
        ) {
            this._runFilters(model);
        }
        //reset is a problem
        // conditions under which we should proxy the events
        if (
            (!contains(['add', 'remove'], eventName) && this.contains(model)) ||
            eventName === 'reset'
        ) {
            this.trigger.apply(this, arguments);
        }
    },

    _addIndex: function (newIndexes, model) {
        for (var name in this._indexes) {
            var indexVal = model[name] || (model.get && model.get(name));
            if (indexVal) newIndexes[name][indexVal] = model;
        }
    },

    _resetIndexes: function () {
        this._indexes = {};
        for (var i = 0; i < this.indexes.length; i++) {
            this._indexes[this.indexes[i]] = {};
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
