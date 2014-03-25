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
    sub.setLimit(5);
    t.equal(sub.length, 5);
    sub.setOffset(5);
    t.equal(sub.at(0).id, 5);
    sub.setOffset();
    sub.setLimit();
    t.equal(sub.length, 100);
    t.end();
});

test('should proxy add events from base', function (t) {
    var base = getBaseCollection();
    var sub = new SubCollection({
        collection: base,
        filter: function (model) {
            return model.awesomeness > 5;
        }
    });
    var newWidget = new Widget({
        name: 'newest',
        id: 999,
        awesomeness: 11,
        sweet: true
    });
    sub.on('add', function (model) {
        t.equal(model, newWidget);
        t.end();
    });
    base.add(newWidget);
});
