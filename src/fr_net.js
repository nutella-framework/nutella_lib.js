/**
 * Framework-level Networking APIs for nutella
 */


var AbstractNet = require('./util/net');


/**
 * Framework-level network APIs for nutella
 * @param main_nutella
 * @constructor
 */
var FRNetSubModule = function(main_nutella) {
    // Store a reference to the main module
    this.nutella = main_nutella;
    this.net = new AbstractNet(main_nutella);
};



/**
 * Subscribes to a channel or filter.
 *
 * @param channel
 * @param callback
 * @param done_callback
 */
FRNetSubModule.prototype.subscribe = function(channel, callback, done_callback) {
    this.net.subscribe_to(channel, callback, undefined, undefined, done_callback);
};



/**
 * Unsubscribes from a channel
 *
 * @param channel
 * @param done_callback
 */
FRNetSubModule.prototype.unsubscribe = function(channel, done_callback) {
    this.net.unsubscribe_from(channel, undefined, undefined, done_callback);
};



/**
 * Publishes a message to a channel
 *
 * @param channel
 * @param message
 */
FRNetSubModule.prototype.publish = function(channel, message) {
    this.net.publish_to(channel, message, undefined, undefined);
};



/**
 * Sends a request.
 *
 * @param channel
 * @param message
 * @param callback
 */
FRNetSubModule.prototype.request = function(channel, message, callback) {
    this.net.request_to(channel, message, callback, undefined, undefined);
};



/**
 * Handles requests.
 *
 * @param channel
 * @param callback
 * @param done_callback
 */
FRNetSubModule.prototype.handle_requests = function(channel, callback, done_callback) {
    this.net.handle_requests_on(channel, callback, undefined, undefined, done_callback);
};



module.exports = FRNetSubModule;
