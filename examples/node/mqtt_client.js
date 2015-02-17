//var nutella = require('../../nutella_lib.js')
//
//console.log(nutella.test())

var mqtt = require('../../simple-js-mqtt-client');

var client = mqtt.connect('ltg.evl.uic.edu');

client.subscribe('demo1', function(message) {
    console.log("First subscription: " + message);
});

var sscb = function(message){
    console.log("Second subscription: " + message);
    client.publish('demo2', "I'm gonna die")
    client.unsubscribe('demo1', sscb);
};
client.subscribe('demo1', sscb);


// Stay alive
console.log("Subscribed and staying alive");
setInterval(function() {}, 5000);