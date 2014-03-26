var test = require('tape');
var Collection = require('ampersand-collection');
var SubCollection = require('../ampersand-subcollection');
var mixins = require('ampersand-collection-underscore-mixin');
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
    var sub = new SubCollection({
        collection: base
    });
    t.equal(sub.length, 100);
    t.end();
});

test('basic `where` filtering', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection({
        collection: base,
        where: {
            sweet: true
        }
    });
    t.equal(sub.length, 50);
    t.end();
});

test('function based filtering', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection({
        collection: base,
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
    var sub = new SubCollection({
        collection: base,
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
    var sub = new SubCollection({
        collection: base,
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
    var SuperSub = SubCollection.extend(mixins);
    var sub = new SuperSub({
        collection: base,
        comparator: 'id'
    });
    t.equal(sub.length, 100);
    t.notEqual(sub.at(0), base.at(0));
    t.end();
});

test('should be able to specify/update offset and limit', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection({
        collection: base,
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
    var sub = new SubCollection({
        collection: base,
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
    var sub = new SubCollection({
        collection: base,
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

test('make sure changes to `where` properties are reflected in sub collections', function (t) {
    t.plan(3);
    var base = getBaseCollection();
    var SweetCollection = SubCollection.extend(mixins);
    var sub = new SweetCollection({
        collection: base,
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
