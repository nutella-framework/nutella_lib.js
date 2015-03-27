/**
 * Run-level Network APIs for nutella
 */


/**
 * Run-level ne
 * @param main_nutella
 * @constructor
 */
var NetSubModule = function(main_nutella) {
    // Store a reference to the main module
    this.main_nutella = main_nutella;

    // Store the subscriptions and the relative callbacks
    this.subscriptions = [];
    this.callbacks = [];
};



/**
 * Subscribes to a channel or filter.
 *
 * @param channel
 * @param callback
 * @param done_callback
 */
NetSubModule.prototype.subscribe = function(channel, callback, done_callback) {
    // Prevent multiple subscriptions to the same channel
    if (this.subscriptions.indexOf(channel)!==-1)
        throw new Error('You can`t subscribe twice to the same channel');
    // Pad the channel
    var runId = this.main_nutella.runId;
    var new_channel = runId + '/' + channel;
    // Define callbacks
    var mqtt_cb;
    if (isChannelWildcard(channel))
        mqtt_cb = function(mqtt_message, mqtt_channel) {
            // Ignore anything that is not JSON or
            // doesn't comply to the nutella protocol
            try {
                var f = extractFieldsFromMessage(mqtt_message);
                var clean_channel = mqtt_channel.replace(runId+'/', '');
                if (f.type==='publish')
                    callback(f.payload, clean_channel, f.componentId, f.resourceId);
            } catch(err) {
            }
        };
    else
        mqtt_cb = function(mqtt_message) {
            // Ignore anything that is not JSON or
            // doesn't comply to the nutella protocol
            try {
                var f = extractFieldsFromMessage(mqtt_message);
                if (f.type==='publish')
                    callback(f.payload, f.componentId, f.resourceId);
            } catch(err) {
            }
        };
    // Update subscriptions, callbacks and subscribe
    this.subscriptions.push(channel);
    this.callbacks.push(mqtt_cb);
    this.main_nutella.mqtt_client.subscribe(new_channel, mqtt_cb, done_callback);
};



/**
 * Unsubscribes from a channel
 *
 * @param channel
 * @param done_callback
 */
NetSubModule.prototype.unsubscribe = function(channel, done_callback) {
    // Find index of subscription and retrieve relative callback
    var idx = this.subscriptions.indexOf(channel);
    var cbAtIdx = this.callbacks[idx];
    // Pad the channel
    var new_channel = this.main_nutella.runId + '/' + channel;
    // Unsubscribe
    this.subscriptions.splice(idx, 1);
    this.callbacks.splice(idx, 1);
    this.main_nutella.mqtt_client.unsubscribe(new_channel, cbAtIdx, done_callback);
};



/**
 * Publishes a message to a channel
 *
 * @param channel
 * @param message
 */
NetSubModule.prototype.publish = function(channel, message) {
    // Pad the channel
    var new_channel = this.main_nutella.runId + '/' + channel;
    var m = prepareMessageForPublish(message, this.main_nutella.componentId, this.main_nutella.resourceId);
    this.main_nutella.mqtt_client.publish(new_channel, m);
};



/**
 * Sends a request.
 *
 * @param channel
 * @param message
 * @param callback
 * @param done_callback
 */
NetSubModule.prototype.request = function(channel, message, callback, done_callback) {
    // Handle optional message parameter
    if (typeof message==='function') {
        if (callback!==undefined)
            done_callback = callback;
        callback = message;
        message = undefined;
    }
    // Pad channel
    var new_channel = this.main_nutella.runId + '/' + channel;
    // Prepare request
    var request_id = Math.floor((Math.random() * 100000) + 1).toString();
    var mqtt_request = prepareRequest(message, request_id, this.main_nutella.componentId, this.main_nutella.resourceId);
    // Prepare callback to handle response
    var mqtt_cb = function(mqtt_response) {
        // Ignore anything that is not JSON or
        // doesn't comply to the nutella protocol
        try {
            var f = extractFieldsFromMessage(mqtt_response);
            var response_id = extractIdFromMessage(mqtt_response);
            // Only handle responses that have proper id set
            if (f.type==='response' && response_id===request_id) {
                // Execute callback
                callback(f.payload);
            }
        } catch(err) {
        }
    };
    // Subscribe to response
    var mqtt_cli = this.main_nutella.mqtt_client;
    mqtt_cli.subscribe(new_channel, mqtt_cb, function() {
        // Once we are subscribed we publish the request
        mqtt_cli.publish(new_channel, mqtt_request);
        // Execute optional done callback
        if (done_callback!==undefined) done_callback();
    });
};



/**
 * Handles requests.
 *
 * @param channel
 * @param callback
 * @param done_callback
 */
NetSubModule.prototype.handle_requests = function(channel, callback, done_callback) {
    // Pad the channel
    var new_channel = this.main_nutella.runId + '/' + channel;
    // Prepare callback
    var c_id = this.main_nutella.componentId;
    var r_id = this.main_nutella.resourceId;
    var mqtt_cli = this.main_nutella.mqtt_client;
    var mqtt_cb = function(mqtt_request) {
        // Ignore anything that is not JSON or
        // doesn't comply to the nutella protocol
        try {
            var f = extractFieldsFromMessage(mqtt_request);
            var id = extractIdFromMessage(mqtt_request);
        } catch(err) {
            return;
        }
        // Only handle requests that have proper id set
        if (f.type!=='request' || id===undefined) return;
        // Execute callback, assemble the response and publish
        var res_json = callback(f.payload, f.componentId, f.resourceId);
        var mqtt_response = prepareResponse(res_json, id, c_id, r_id);
        mqtt_cli.publish(new_channel, mqtt_response);
    };
    // Subscribe
    this.main_nutella.mqtt_client.subscribe(new_channel, mqtt_cb, done_callback);
};



//
// Helper function
// Extracts nutella parameters from a received message
//
function extractFieldsFromMessage(message) {
    var params = JSON.parse(message);
    var s = params.from.split('/');
    delete params.from;
    params.componentId = s[0];
    if (s.length===2)
        params.resourceId  = s[1];
    return params;
}



//
// Helper function
// Extracts request id from a received message
//
function extractIdFromMessage(message) {
    var params = JSON.parse(message);
    return params.id;
}



//
// Helper function
// Pads a message with the nutella protocol fields
//
function prepareMessageForPublish(message, componentId, resourceId) {
    var from = resourceId===undefined ? componentId : (componentId + '/' + resourceId);
    if (message===undefined)
        return JSON.stringify({type: 'publish', from: from});
    return JSON.stringify({type: 'publish', from: from, payload: message});
}



//
// Helper function
// Pads a request with the nutella protocol fields
//
function prepareRequest(message, request_id, componentId, resourceId) {
    var from = resourceId===undefined ? componentId : (componentId + '/' + resourceId);
    if (message===undefined)
        return JSON.stringify({id: request_id, type: 'request', from: from});
    return JSON.stringify({id: request_id, type: 'request', from: from, payload: message});
}



//
// Helper function
// Pads a response with the nutella protocol fields
//
function prepareResponse(message, request_id, componentId, resourceId) {
    var from = resourceId===undefined ? componentId : (componentId + '/' + resourceId);
    if (message===undefined)
        return JSON.stringify({id: request_id, type: 'response', from: from});
    return JSON.stringify({id: request_id, type: 'response', from: from, payload: message});
}



// Helper function to test if a channel is wildcard or not.
// Returns true if it is Returns true is.
// See MQTT specification for wildcard channels
// {http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Toc398718106 here
//
function isChannelWildcard(channel) {
    return channel.indexOf('#')!==-1 || channel.indexOf('+')!==-1;
}


module.exports = NetSubModule;
