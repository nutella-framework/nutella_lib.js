var NUTELLA = require('../src/nutella_lib');

// Access the current version of the library
//NUTELLA.version;

// Parse the command line parameters
//NUTELLA.parseArgs();
//NUTELLA.parseAppArgs();
//NUTELLA.parseFrArgs();

// Initialize nutella
var nutella = NUTELLA.init('ltg.evl.uic.edu', 'my_app_id', 'my_run_id', 'demo_node_bot');

// Set resource id
nutella.setResourceId('r_id');

//nutella.log.test();
//nutella.net.publish('channel', 'message');
//nutella.persist.test();      // this should only work in node
//nutella = NUTELLA.initApp('ltg.evl.uic.edu', 'my_app_id', 'demo_node_bot');
//nutella.app.net.test();
//nutella.app.log.test();
//nutella.app.persist.test();
