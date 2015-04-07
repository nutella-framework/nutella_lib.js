/**
 * App-level Networking APIs for nutella
 */


var AbstractNet = require('./util/net');


/**
 * App-level network APIs for nutella
 * @param main_nutella
 * @constructor
 */
var AppNetSubModule = function(main_nutella) {
    this.net = new AbstractNet(main_nutella);
};



/**
 * Subscribes to a channel or filter.
 *
 * @param channel
 * @param callback
 * @param done_callback
 */
AppNetSubModule.prototype.subscribe = function(channel, callback, done_callback) {
    this.net.subscribe_to(channel, callback, this.net.nutella.appId, undefined, done_callback);
};



/**
 * Unsubscribes from a channel
 *
 * @param channel
 * @param done_callback
 */
AppNetSubModule.prototype.unsubscribe = function(channel, done_callback) {
    this.net.unsubscribe_from(channel, this.net.nutella.appId, undefined, done_callback);
};



/**
 * Publishes a message to a channel
 *
 * @param channel
 * @param message
 */
AppNetSubModule.prototype.publish = function(channel, message) {
    this.net.publish_to(channel, message, this.net.nutella.appId, undefined);
};



/**
 * Sends a request.
 *
 * @param channel
 * @param message
 * @param callback
 */
AppNetSubModule.prototype.request = function(channel, message, callback) {
    this.net.request_to(channel, message, callback, this.net.nutella.appId, undefined);
};



/**
 * Handles requests.
 *
 * @param channel
 * @param callback
 * @param done_callback
 */
AppNetSubModule.prototype.handle_requests = function (channel, callback, done_callback) {
    this.net.handle_requests_on(channel, callback, this.net.nutella.appId, undefined, done_callback);
};



//----------------------------------------------------------------------------------------------------------------
// Application-level APIs to communicate at the run-level
//----------------------------------------------------------------------------------------------------------------

// TODO, finish the framework level equivalent and then work on this

//----------------------------------------------------------------------------------------------------------------
// Application-level APIs to communicate at the run-level (broadcast)
//----------------------------------------------------------------------------------------------------------------

// TODO, finish the framework level equivalent and then work on this


module.exports = AppNetSubModule;
