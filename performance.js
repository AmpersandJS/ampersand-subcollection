/*jshint node: true*/
var Collection = require('ampersand-collection');
var SubCollection = require('./ampersand-subcollection');
var State = require('ampersand-state');
var sample = require('amp-sample');

var collectionSize = 2000;
//var collectionSize = 3;
var i = 0;
var names = ['Cat', 'Dog', 'Turtle', 'Dinosaur', 'Fish', 'Pony', 'Axolotl'];
var itemData = [];

var coolCounter = 0;
var activeCounter = 0;

var Item = State.extend({
  props: {
    name: 'string',
    active: 'boolean',
    cool: 'boolean'
  }
});
var Items = Collection.extend({
  Model: Item
});

var items = new Items();
var activeItems = new SubCollection(items, {
  filter: function (item) {
    activeCounter++;
  	return item.active;
  }
});

/*
var coolItems = new SubCollection(activeItems, {
  filter: function (item) {
    coolCounter++;
  	return item.cool;
  }
});
*/

for (i = 0;i < collectionSize; i++) {
    itemData.push({
        id: i,
        name: sample(names, 1)[0],
        //active: Boolean(i % 2), //Half active
        active: true,
        cool: Boolean(i % 5) //One quarter cool
    });
}
//console.log('data', itemData);
console.time('using set all at once');
items.set(itemData);
console.timeEnd('using set all at once');
console.log('active ran', activeCounter, 'times');
console.log('cool ran', coolCounter, 'times');
console.log('items:', collectionSize);
console.log('active:', activeItems.length);
//console.log('cool:', coolItems.length);
console.log('----------');

/*
items.reset([]);
activeCounter = 0;
coolCounter = 0;
console.time('using add on each item');

for (i = 0;i < collectionSize; i++) {
    items.add(itemData[i]);
}

console.timeEnd('using add on each item');
console.log('active ran', activeCounter, 'times');
console.log('cool ran', coolCounter, 'times');
console.log('items:', collectionSize);
console.log('active:', activeItems.length);
console.log('cool:', coolItems.length);
console.log('----------');
activeCounter = 0;
coolCounter = 0;
console.time('using reset');
items.reset(itemData);
console.timeEnd('using reset');
console.log('active ran', activeCounter, 'times');
console.log('cool ran', coolCounter, 'times');
console.log('items:', collectionSize);
console.log('active:', activeItems.length);
console.log('cool:', coolItems.length);
*/
