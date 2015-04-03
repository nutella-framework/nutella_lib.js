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



//----------------------------------------------------------------------------------------------------------------
// Framework-level APIs to communicate at the run-level
//----------------------------------------------------------------------------------------------------------------

/**
 * Allows framework-level APIs to subscribe to a run-level channel within a specific run
 *
 * @param app_id
 * @param run_id
 * @param channel
 * @param callback
 * @param done_callback
 */
FRNetSubModule.prototype.subscribe_to_run = function(app_id, run_id, channel, callback,done_callback) {
    this.net.subscribe_to(channel,callback,app_id,run_id,done_callback)
};


/**
 * Allows framework-level APIs to unsubscribe from a run-level channel within a specific run
 *
 * @param app_id
 * @param run_id
 * @param channel
 * @param done_callback
 */
FRNetSubModule.prototype.unsubscribe_to_run = function( app_id, run_id, channel, done_callback ) {
    this.net.unsubscribe_from(channel, app_id, run_id, done_callback);
};


/**
 * Allows framework-level APIs to publish to a run-level channel within a specific run
 *
 * @param app_id
 * @param run_id
 * @param channel
 * @param message
 */
FRNetSubModule.prototype.publish_to_run = function( app_id, run_id, channel, message ) {
    this.net.publish_to(channel, message, app_id, run_id);
};


/**
 * Allows framework-level APIs to make an asynchronous request to a run-level channel within a specific run
 *
 * @param app_id
 * @param run_id
 * @param channel
 * @param request
 * @param callback
 */
FRNetSubModule.prototype.request_to_run = function( app_id, run_id, channel, request, callback) {
    this.net.request_to(channel, request, callback, app_id, run_id);
};


/**
 * Allows framework-level APIs to handle requests on a run-level channel within a specific run
 *
 * @param app_id
 * @param run_id
 * @param channel
 * @param callback
 */
FRNetSubModule.prototype.handle_requests_on_run = function( app_id, run_id, channel, callback, done_callback) {
    this.net.handle_requests_on(channel, callback, app_id, run_id, done_callback)
};



//----------------------------------------------------------------------------------------------------------------
// Framework-level APIs to communicate at the run-level (broadcast)
//----------------------------------------------------------------------------------------------------------------

/**
 * Allows framework-level APIs to subscribe to a run-level channel *for ALL runs*
 *
 * @param channel
 * @param callback
 * @param done_callback
 */
FRNetSubModule.prototype.subscribe_to_all_runs = function( channel, callback, done_callback ) {
    // TODO
};


/**
 * Allows framework-level APIs to unsubscribe from a run-level channel *for ALL runs*
 *
 * @param channel
 */
FRNetSubModule.prototype.unsubscribe_from_all_runs = function(channel, done_callback) {
    this.net.unsubscribe_from(channel, '+', '+', done_callback);
};


/**
 * Allows framework-level APIs to publish a message to a run-level channel *for ALL runs*
 *
 * @param channel
 * @param message
 */
FRNetSubModule.prototype.publish_to_all_runs = function( channel, message ) {
    // TODO need runslist!!!!
};


/**
 * Allows framework-level APIs to send a request to a run-level channel *for ALL runs*
 *
 * @param channel
 * @param request
 * @param callback
 */
FRNetSubModule.prototype.request_to_all_runs = function(channel, request, callback) {
    // TODO need runlist!
};


/**
 * Allows framework-level APIs to handle requests to a run-level channel *for ALL runs*
 *
 * @param channel
 * @param callback
 * @param done_callback
 */
FRNetSubModule.prototype.handle_requests_on_all_runs = function(channel, callback, done_callback) {
    // TODO
};




//----------------------------------------------------------------------------------------------------------------
// Framework-level APIs to communicate at the application-level
//----------------------------------------------------------------------------------------------------------------

/**
 * Allows framework-level APIs to subscribe to an app-level channel
 *
 * @param app_id
 * @param channel
 * @param callback
 * @param done_callback
 */
FRNetSubModule.prototype.subscribe_to_app = function(app_id, channel, callback, done_callback) {
    this.net.subscribe_to(channel,callback,app_id, undefined, done_callback)
};


/**
 * Allows framework-level APIs to unsubscribe from an app-level channel within a specific run
 *
 * @param app_id
 * @param channel
 * @param done_callback
 */
FRNetSubModule.prototype.unsubscribe_to_app = function( app_id, channel, done_callback) {
    this.net.unsubscribe_from(channel,app_id,undefined, done_callback);
};


/**
 * Allows framework-level APIs to publish to an app-level channel
 *
 * @param app_id
 * @param channel
 * @param message
 */
FRNetSubModule.prototype.publish_to_app = function(app_id, channel, message) {
    this.net.publish_to(channel,message,app_id,undefined);
};


/**
 * Allows framework-level APIs to make an asynchronous request to a run-level channel within a specific run
 *
 * @param app_id
 * @param channel
 * @param request
 * @param callback
 */
FRNetSubModule.prototype.request_to_app = function( app_id, channel, request, callback) {
  this.net.request_to(channel, request, callback, app_id, undefined);
};


/**
 * Allows framework-level APIs to handle requests on a run-level channel within a specific run
 *
 * @param app_id
 * @param channel
 * @param callback
 * @param done_callback
 */
FRNetSubModule.prototype.handle_requests_on_app = function(app_id, channel, callback, done_callback) {
    this.net.handle_requests_on(channel, callback, app_id, undefined, done_callback);
};


//----------------------------------------------------------------------------------------------------------------
// Framework-level APIs to communicate at the application-level (broadcast)
//----------------------------------------------------------------------------------------------------------------


FRNetSubModule.prototype.subscribe_to_all_apps = function(channel, callback, done_callback) {

};



module.exports = FRNetSubModule;
