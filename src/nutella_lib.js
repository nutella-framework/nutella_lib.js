/******************
 * nutella_lib.js *
 ******************/
var mqtt = require('simple-mqtt-client');

var c1 = mqtt.connect('ltg.evl.uic.edu');
c1.publish('test_channel', 'message!!!');

console.log('Hello civilized module');