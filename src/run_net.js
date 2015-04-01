/**
 * Run-level Network APIs for nutella
 */


var net = require('./util/net');


/**
 * Run-level network APIs for nutella
 * @param main_nutella
 * @constructor
 */
var NetSubModule = function(main_nutella) {
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
NetSubModule.prototype.subscribe = function(channel, callback, done_callback) {
    net.subscribe_to(channel, callback, nutella.appId, nutella.runId, done_callback);
};



/**
 * Unsubscribes from a channel
 *
 * @param channel
 * @param done_callback
 */
NetSubModule.prototype.unsubscribe = function(channel, done_callback) {
    net.unsubscribe_from(channel, nutella.appId, nutella.runId, done_callback);
};



/**
 * Publishes a message to a channel
 *
 * @param channel
 * @param message
 */
NetSubModule.prototype.publish = function(channel, message) {
    net.publish_to(channel, message, nutella.appId, nutella.runId);
};



/**
 * Sends a request.
 *
 * @param channel
 * @param message
 * @param callback
 */
NetSubModule.prototype.request = function(channel, message, callback) {
    net.request_to(channel, message, callback, nutella.appId, nutella.runId);
};



/**
 * Handles requests.
 *
 * @param channel
 * @param callback
 * @param done_callback
 */
NetSubModule.prototype.handle_requests = function(channel, callback, done_callback) {
    net.handle_requests_on(channel, callback, nutella.appId, nutella.runId, done_callback);
};


module.exports = NetSubModule;
