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
    this._resetIndexes(this._indexes);
    this._filtered = [];
    this.mainIndex = collection.mainIndex;
    this.models = []; //Our filtered, offset/limited models
    this.configure(spec || {}, true);
    this.listenTo(this.collection, 'all', this._onCollectionEvent);
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
        return index[query] || index[query[this.mainIndex]] || this._indexes.cid[query] || this._indexes.cid[query.cid];
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
        this._filtered = [];
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

    //Add a model to this subcollection that has already passed the filters
    _addModel: function (model) {
        var newModels = slice.call(this._filtered);
        newModels.push(model);
        if (this.comparator) {
            newModels = _.sortBy(newModels, this.comparator);
        } else {
            newModels = _.sortBy(newModels, function (model) {
                //TODO
                return 0;
                //Somehow return the index of this model in parent
            });
        }
        this._filtered = newModels;
        this._addIndex(this._indexes, model);
        this.trigger('add', model, this);
    },

    //Test if a model passes our filters
    _testModel: function (model) {
        if (this._filters.length === 0) {
            return true;
        }
        return every(this._filters, function (filter) {
            return filter(model);
        });
    },
    //Remove a model if it's in this subcollection
    _removeModel: function (model) {
        var newModels = slice.call(this._filtered);
        var modelIndex = newModels.indexOf(model);
        if (modelIndex > -1) {
            newModels.splice(modelIndex, 1);
            this._filtered = newModels;
            this._removeIndex(this._indexes, model);
            this.trigger('remove', model, this);
        }
    },

    _sliceModels: function () {
        var newModels = slice.call(this._filtered);
        var offset = (this.offset || 0);
        if (this.limit || this.offset) {
            newModels = newModels.slice(offset, this.limit + offset);
        }
        this.models = newModels;
    },

    _runFilters: function () {
        // make a copy of the array for comparisons
        var existingModels = slice.call(this.models);
        var rootModels = slice.call(this.collection.models);
        var offset = (this.offset || 0);
        var newIndexes = {};
        var newModels, toAdd, toRemove, indexVal, name;

        this._resetIndexes(newIndexes);

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

        newModels.forEach(function (model) {
            this._addIndex(newIndexes, model);
        }, this);

        // Cache a reference to the full filtered set to allow this._filtered.length. Ref: #6
        if (rootModels.length) {
            this._filtered = newModels;
            this._indexes = newIndexes;
        } else {
            this._filtered = [];
            this._resetIndexes(this._indexes);
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
        var accepted, alreadyHave;

        var action = eventName;

        if (
            (propName !== undefined && propName === this.comparator) ||
            contains(this._watched, propName)
        ) { //If a property we care about changed
            alreadyHave = this._filteredGet(model);
            accepted = this._testModel(model);

            if (!alreadyHave && accepted) {
                action = 'add';
            } else if (alreadyHave && !accepted) {
                action = 'remove';
            } else {
                action = 'ignore';
            }
        } else if (action === 'add') { //See if we really want to add
            alreadyHave = this._filteredGet(model);
            if (!this._testModel(model) || alreadyHave) {
                action = 'ignore';
            }
        }

        if (action === 'add') {
            if (this._filtered.length === 0) {
                this._runFilters();
            } else {
                this._addModel(model);
            }
        } else if (action === 'remove') {
            this._removeModel(model);
        } else if (action === 'reset') {
            //TODO make init share this functionality
            this._runFilters();
        }
        this._sliceModels();

        if (action === 'reset') {
            //After slicing
            this.trigger.apply(this, arguments);
        }
    },

    _addIndex: function (newIndexes, model) {
        for (var name in this._indexes) {
            var indexVal = model[name] || (model.get && model.get(name));
            if (indexVal) newIndexes[name][indexVal] = model;
        }
    },

    _removeIndex: function (newIndexes, model) {
        for (var name in this._indexes) {
            delete this._indexes[name][model[name] || (model.get && model.get(name))];
        }
    },

    _resetIndexes: function (newIndexes) {
        for (var i = 0; i < this.indexes.length; i++) {
            newIndexes[this.indexes[i]] = {};
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
