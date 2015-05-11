var NUTELLA = require('../src/nutella_lib');

// Access the current version of the library
NUTELLA.version;

// Parse the command line parameters
NUTELLA.parseArgs();
NUTELLA.parseAppArgs();
NUTELLA.parseFrArgs();

// Parse the componentId from the bot directory
NUTELLA.parseComponentId();

// Initialize nutella
var nutella = NUTELLA.init('127.0.0.1', 'crepe', 'default', 'demo_run_interface');

// Set resource id
nutella.setResourceId('r_id');

// Get all resources
nutella.location.ready(function() {console.log(nutella.location.resources);});

//nutella.log.test();
//nutella.net.publish('channel', 'message');
//nutella.persist.test();      // this should only work in node
//nutella = NUTELLA.initApp('ltg.evl.uic.edu', 'my_app_id', 'demo_node_bot');
//nutella.app.net.test();
//nutella.app.log.test();
//nutella.app.persist.test();
