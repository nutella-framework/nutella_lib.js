/**
 * App-level Networking APIs for nutella
 */


var net = require('./util/net');


/**
 * App-level network APIs for nutella
 * @param main_nutella
 * @constructor
 */
var AppNetSubModule = function(main_nutella) {
    // Store a reference to the main module
    this.nutella = main_nutella;
    this.net = net.AbstractNet(main_nutella);
};



/**
 * Subscribes to a channel or filter.
 *
 * @param channel
 * @param callback
 * @param done_callback
 */
AppNetSubModule.prototype.subscribe = function(channel, callback, done_callback) {
    net.subscribe_to(channel, callback, this.nutella.appId, undefined, done_callback);
};



/**
 * Unsubscribes from a channel
 *
 * @param channel
 * @param done_callback
 */
AppNetSubModule.prototype.unsubscribe = function(channel, done_callback) {
    net.unsubscribe_from(channel, this.nutella.appId, undefined, done_callback);
};



/**
 * Publishes a message to a channel
 *
 * @param channel
 * @param message
 */
AppNetSubModule.prototype.publish = function(channel, message) {
    net.publish_to(channel, message, this.nutella.appId, undefined);
};



/**
 * Sends a request.
 *
 * @param channel
 * @param message
 * @param callback
 */
AppNetSubModule.prototype.request = function(channel, message, callback) {
    net.request_to(channel, message, callback, this.nutella.appId, undefined);
};



/**
 * Handles requests.
 *
 * @param channel
 * @param callback
 * @param done_callback
 */
AppNetSubModule.prototype.handle_requests = function(channel, callback, done_callback) {
    net.handle_requests_on(channel, callback, this.nutella.appId, undefined, done_callback);
};



module.exports = AppNetSubModule;
