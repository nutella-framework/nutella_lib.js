var NUTELLA = require('../src/nutella_lib');

// Access the current version of the library
NUTELLA.version;

// Parse the command line parameters
//NUTELLA.parseArgs();
//NUTELLA.parseAppArgs();
//NUTELLA.parseFrArgs();

// Parse the componentId from the bot directory
//NUTELLA.parseComponentId();

// Initialize nutella
var nutella = NUTELLA.init('127.0.0.1', 'hunger-games', 'default', 'demo_run_interface');

// Set resource id
nutella.setResourceId('r_id');

/*
var state = nutella.persist.getMongoObjectStore('state');
var history = nutella.persist.getMongoObjectStore('history');

state.load(function() {
    console.log('state loaded');

    console.log(state);

    state['lol'] = {bau: 'miao', array: []};

    state.save();

});

history.load(function() {
    console.log('history loaded');

    console.log(history);

    history['lol'] = {bau: 'test', array: []};

    history.save();

});
*/

var state = nutella.persist.getMongoCollectionStore('state');

state.load(function() {
    console.log('state loaded');

    console.log(state);

    state.push({a: 1234});

    state.save();

});

// Get all resources
//nutella.location.ready(function() {console.log(nutella.location.resources);});

//var obj1 = nutella.persist.getJsonObjectStore('test1');
//console.log(obj1);
//obj1.load();
//console.log(obj1);
//obj1.pippo = 'topo';
//console.log(obj1);
//obj1.save();
//console.log(obj1);
//var obj2 = nutella.persist.getJsonObjectStore('test2');
//obj2.pippo = 'zio';
//obj2.save();

//var arr1 = nutella.persist.getJsonCollectionStore('test_coll1');
//console.log(arr1);
//arr1.load();
//console.log(arr1);
//arr1.push('one');
//console.log(arr1);
//arr1.save();
//console.log(arr1);
//var arr2 = nutella.persist.getJsonCollectionStore('test_coll2');
//arr2.push('two');
//arr2.save();
//console.log(arr2);




