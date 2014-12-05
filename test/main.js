var test = require('tape');
var mixins = require('ampersand-collection-underscore-mixin');
var Collection = require('ampersand-collection').extend(mixins);
var SubCollection = require('../ampersand-subcollection');
var Model = require('ampersand-state');
var _ = require('underscore');


// our widget model
var Widget = Model.extend({
    props: {
        id: 'number',
        name: 'string',
        awesomeness: 'number',
        sweet: 'boolean'
    }
});

// our base collection
var Widgets = Collection.extend(mixins, {
    model: Widget,
    comparator: 'awesomeness'
});

// helper for getting a base collection
function getBaseCollection() {
    var widgets = new Widgets();

    // add a hundred items to our base collection
    var items = 100;
    while (items--) {
        widgets.add({
            id: items,
            name: 'abcdefghij'.split('')[items % 10],
            awesomeness: (items % 10),
            sweet: (items % 2 === 0)
        });
    }
    return widgets;
}

test('basic init, length', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection(base);
    t.equal(sub.length, 100);
    t.end();
});

test('it should report as being a collection', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection(base);
    t.ok(sub.isCollection);

    sub.isCollection = false;
    t.ok(sub.isCollection);
    t.end();
});

test('basic `where` filtering', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection(base, {
        where: {
            sweet: true
        }
    });
    t.equal(sub.length, 50);
    t.end();
});

test('add a filter after init', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection(base);
    sub.addFilter(function (model) {
        return model.awesomeness === 5;
    });

    t.equal(sub.length, 10);
    t.end();
});

test('remove a filter', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection(base);
    var isPartiallyAwesome = function (model) {
        return model.awesomeness === 5;
    };

    sub.addFilter(isPartiallyAwesome);
    t.equal(sub.length, 10);

    sub.removeFilter(isPartiallyAwesome);
    t.equal(sub.length, 100);

    t.end();
});

test('swap filters', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection(base);
    var isPartiallyAwesome = function (model) {
        return model.awesomeness === 5;
    };
    var isSweet = function (model) {
        return model.sweet;
    };

    sub.addFilter(isPartiallyAwesome);
    t.equal(sub.length, 10);

    sub.swapFilters(isSweet, isPartiallyAwesome);
    t.equal(sub.length, 50);

    t.end();
});

test('swap all filters', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection(base);
    var isPartiallyAwesome = function (model) {
        return model.awesomeness === 5;
    };
    var isSweet = function (model) {
        return model.sweet;
    };

    sub.addFilter(isPartiallyAwesome);
    t.equal(sub.length, 10);

    sub.swapFilters(isSweet);
    t.equal(sub.length, 50);

    t.end();
});

test('function based filtering', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection(base, {
        filter: function (model) {
            return model.awesomeness > 5;
        }
    });
    t.ok(sub.length > 0, 'should have some that match');
    t.ok(sub.length < 100, 'but not all');
    t.end();
});

test('multiple filter functions', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection(base, {
        filters: [
            function (model) {
                return model.awesomeness > 5;
            },
            function (model) {
                return model.name === 'j';
            }
        ]
    });
    t.equal(sub.length, 10);
    t.end();
});

test('mixed filter and `where`', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection(base, {
        filter: function (model) {
            return model.awesomeness > 5;
        },
        where: {
            name: 'j'
        }
    });
    t.equal(sub.length, 10);
    t.end();
});

test('should sort independent of base', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection(base, {
        comparator: 'id'
    });
    t.equal(sub.length, 100);
    t.notEqual(sub.at(0), base.at(0));
    t.end();
});

test('should be able to specify/update offset and limit', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection(base, {
        comparator: 'id',
        limit: 10
    });
    t.equal(sub.length, 10);
    t.equal(sub.at(0).id, 0);
    sub.configure({limit: 5});
    t.equal(sub.length, 5);
    sub.configure({offset: 5});
    t.equal(sub.at(0).id, 5);
    sub.configure({offset: null});
    sub.configure({limit: null});
    t.equal(sub.length, 100);
    t.end();
});

test('should fire `add` events only if removed items match filter', function (t) {
    t.plan(1);
    var base = getBaseCollection();
    var sub = new SubCollection(base, {
        filter: function (model) {
            return model.awesomeness > 5;
        }
    });
    var awesomeWidget = new Widget({
        name: 'awesome',
        id: 999,
        awesomeness: 11,
        sweet: true
    });
    var lameWidget = new Widget({
        name: 'lame',
        id: 1000,
        awesomeness: 0,
        sweet: false
    });
    sub.on('add', function (model) {
        t.equal(model, awesomeWidget);
        t.end();
    });
    base.add([lameWidget, awesomeWidget]);
});

test('should fire `remove` events only if removed items match filter', function (t) {
    t.plan(3);
    var base = getBaseCollection();
    var sub = new SubCollection(base, {
        filter: function (model) {
            return model.awesomeness > 5;
        }
    });
    // grab a lame widget
    var lameWidget = base.find(function (model) {
        return model.awesomeness < 5;
    });
    // grab an awesome widget
    var awesomeWidget = base.find(function (model) {
        return model.awesomeness > 5;
    });
    sub.on('remove', function (model) {
        t.equal(model, awesomeWidget);
        t.end();
    });
    t.ok(awesomeWidget);
    t.ok(lameWidget);
    base.remove([lameWidget, awesomeWidget]);
});

test('should fire `add` and `remove` events after models are updated', function (t) {
    t.plan(2);
    var base = getBaseCollection();
    var sub = new SubCollection(base);
    var awesomeWidget = new Widget({
        name: 'awesome',
        id: 999,
        awesomeness: 11,
        sweet: true
    });
    sub.on('add', function () {
        t.equal(sub.models.length, 101);
    });
    sub.on('remove', function () {
        t.equal(sub.models.length, 100);
        t.end();
    });
    base.add(awesomeWidget);
    base.remove(awesomeWidget);
});

test('make sure changes to `where` properties are reflected in sub collections', function (t) {
    t.plan(3);
    var base = getBaseCollection();
    var sub = new SubCollection(base, {
        where: {
            sweet: true
        }
    });
    var firstSweet = sub.first();
    sub.on('remove', function (model) {
        t.equal(model, firstSweet);
        t.equal(firstSweet.sweet, false);
        t.end();
    });
    t.ok(firstSweet);
    firstSweet.sweet = false;
});

test('should be able to `get` a model by id or other index', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection(base, {
        where: {
            sweet: true
        }
    });
    var cool = sub.first();
    var lame = base.find(function (model) {
        return model.sweet === false;
    });
    // sanity checks
    t.ok(cool.sweet);
    t.notOk(lame.sweet);
    t.ok(sub.models.indexOf(lame) === -1);
    t.ok(base.models.indexOf(lame) !== -1);
    t.notEqual(sub.get(lame.id), lame);
    t.equal(sub.get(cool.id), cool);
    t.end();
});

test('should be able to listen for `change:x` events on subcollection', function (t) {
    t.plan(1);
    var base = getBaseCollection();
    var sub = new SubCollection(base, {
        where: {
            sweet: true
        }
    });
    sub.on('change:name', function () {
        t.pass('handler called');
        t.end();
    });
    var cool = sub.first();
    cool.name = 'new name';
});

test('should be able to listen for general `change` events on subcollection', function (t) {
    t.plan(1);
    var base = getBaseCollection();
    var sub = new SubCollection(base, {
        where: {
            sweet: true
        }
    });
    sub.on('change', function () {
        t.pass('handler called');
        t.end();
    });
    var cool = sub.first();
    cool.name = 'new name';
});

test('have the correct ordering saved when processing a sort event', function (t) {
    t.plan(3);
    var base = getBaseCollection();
    var sub = new SubCollection(base, {
        where: {
            sweet: true
        },
        comparator: 'name'
    });

    var third = sub.at(42);

    third.sweet = false;

    t.notEqual(third.id, sub.at(42).id);
    t.notOk(sub.get(third.id));

    sub.on('sort', function () {
        t.equal(third.id, sub.at(42).id);
    });

    third.sweet = true;
});

test('reset works correctly/efficiently when passed to configure', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection(base, {
        where: {
            sweet: true
        }
    });
    var itemsRemoved = [];
    var itemsAdded = [];
    var awesomeIds = sub.pluck('id');

    t.equal(sub.length, 50, 'should be 50 that match initial filter');

    sub.on('remove', function (model) {
        itemsRemoved.push(model);
    });
    sub.on('add', function (model) {
        itemsAdded.push(model);
    });

    sub.configure({
        where: {
            sweet: true,
            awesomeness: 6
        }
    }, true);

    t.equal(sub.length, 10, 'should be 10 that match second filter');
    t.equal(itemsRemoved.length, 40, 'five of the items should have been removed');
    t.equal(itemsAdded.length, 0, 'nothing should have been added');

    t.ok(_.every(itemsRemoved, function (item) {
        return item.sweet === true && item.awesomeness !== 6;
    }), 'every item removed should have awesomeness not 6 and be sweet: true');

    t.end();
});
