/**
 * Network APIs abstraction
 */


var AbstractNet = function(main_nutella) {
    this.subscriptions = [];
    this.callbacks = [];
    this.nutella = main_nutella;
};


/**
 * This callback is fired whenever a message is received by the subscribe
 *
 * @callback subscribeCallback
 * @param {string} message - the received message. Messages that are not JSON are discarded
 * @param {string} [channel] - the channel the message was received on (optional, only for wildcard subscriptions)
 * @param {Object} from - the sender's identifiers (run_id, app_id, component_id and optionally resource_id)
 */

/**
 * Subscribes to a channel or to a set of channels
 *
 * @param {string} channel - the channel or filter we are subscribing to. Can contain wildcard(s)
 * @param {subscribeCallback} callback - fired whenever a message is received
 * @param {string} appId - used to pad channels
 * @param {string} runId - used to pad channels
 * @param {function} done_callback - fired whenever the subscribe is successful
 */
AbstractNet.prototype.subscribe_to = function(channel, callback, appId, runId, done_callback) {
    // Pad channel
    var padded_channel = pad_channel(channel, appId, runId);
    // Maintain unique subscriptions
    if(this.subscriptions.indexOf(padded_channel)>-1)
        throw 'You can`t subscribe twice to the same channel`';
    // Depending on what type of channel we are subscribing to (wildcard or simple)
    // register a different kind of callback
    var mqtt_cb;
    if(this.nutella.mqtt_client.isChannelWildcard(padded_channel))
        mqtt_cb = function(mqtt_message, mqtt_channel) {
            try {
                var f = extract_fields_from_message(mqtt_message);
                if(f.type==='publish')
                    callback(f.payload, un_pad_channel(mqtt_channel, appId, runId), f.from);
            } catch(e) {
                if (e instanceof SyntaxError) {
                    // Message is not JSON, drop it
                } else {
                    // Bubble up whatever exception is thrown
                    throw e;
                }
            }
        };
    else
        mqtt_cb = function(mqtt_message) {
            try {
                var f = extract_fields_from_message(mqtt_message);
                if(f.type==='publish')
                    callback(f.payload, f.from);
            } catch(e) {
                if (e instanceof SyntaxError) {
                    // Message is not JSON, drop it
                } else {
                    // Bubble up whatever exception is thrown
                    throw e;
                }
            }
        };
    // Add to subscriptions, save mqtt callback and subscribe
    this.subscriptions.push(padded_channel);
    this.callbacks.push(mqtt_cb);
    this.nutella.mqtt_client.subscribe(padded_channel, mqtt_cb, done_callback);
    // Notify subscriptions bot
    this.publish_to('subscriptions', {channel:  padded_channel}, appId, runId);
};


/**
 * Unsubscribes from a channel or a set of channels
 *
 * @param {string} channel - we want to unsubscribe from. Can contain wildcard(s)
 * @param {string} appId - used to pad channels
 * @param {string} runId - used to pad channels
 * @param {function} done_callback - fired whenever the subscribe is successful
 */
AbstractNet.prototype.unsubscribe_from = function(channel, appId, runId, done_callback ) {
    // Pad channel
    var padded_channel = pad_channel(channel, appId, run_id);
    var idx = this.subscriptions.indexOf(padded_channel);
    // If we are not subscribed to this channel, return (no error is given)
    if(idx===-1) return;
    // Fetch the mqtt_callback associated with this channel/subscription
    var mqtt_cb = this.callbacks[idx];
    // Remove from subscriptions, callbacks and unsubscribe
    this.subscriptions.splice(idx, 1);
    this.callbacks.splice(idx, 1);
    this.nutella.mqtt_client.unsubscribe(padded_channel, mqtt_cb, done_callback);
};


/**
 * Publishes a message to a channel
 *
 * @param {String} channel - the channel we want to publish the message to. *CANNOT* contain wildcard(s)!
 * @param {Object} message - the message we are publishing. This can be any JS variable, even undefined.
 * @param {String} appId - used to pad the channels
 * @param {String} runId - used to pad the channels
 */
AbstractNet.prototype.publish_to = function(channel, message, appId, runId) {
    // Pad channel
    var padded_channel = pad_channel(channel, appId, runId);
    // Throw exception if trying to publish something that is not JSON
    try {
        var m = prepare_message_for_publish(message, this.nutella);
        this.nutella.mqtt_client.publish(padded_channel, m);
    } catch(e) {
        console.error('Error: you are trying to publish something that is not JSON');
        console.error(e.message);
    }
};


/**
 * This callback is fired whenever a response to a request is received
 *
 * @callback requestCallback
 * @param {string} response - the body of the response
 */

/**
 * Performs an asynchronous request
 *
 * @param {string} channel - the channel we want to make the request to. *CANNOT* contain wildcard(s)!
 * @param {string} message - the body of the request. This can be any JS variable, even undefined.
 * @param {requestCallback} callback - the callback that is fired whenever a response is received
 * @param {string} appId - used to pad channels
 * @param {string} runId - used to pad channels
 */
AbstractNet.prototype.request_to = function( channel, message, callback, appId, runId ) {
    // Pad channel
    var padded_channel = pad_channel(channel, appId, runId);
    // Prepare message
    var m = prepare_message_for_request(message, this.nutella);
    //Prepare callback
    var mqtt_cb = function(mqtt_message) {
        var f = extract_fields_from_message(mqtt_message);
        if (f.id===m.id && f.type==='response') {
            callback(f.payload);
            this.nutella.mqtt_client.unsubscribe(padded_channel, mqtt_cb);
        }
    };
    // Subscribe
    this.nutella.mqtt_client.subscribe(padded_channel, mqtt_cb, function() {
        // Publish message
        this.nutella.mqtt_client.publish( padded_channel, m.message );
    });

};


/**
 * This callback is fired whenever a request is received that needs to be handled
 *
 * @callback handleCallback
 * @param {string} request - the body of the received request (payload). Messages that are not JSON are discarded.
 * @param {Object} from - the sender's identifiers (run_id, app_id, component_id and optionally resource_id)
 * @return {Object} The response sent back to the client that performed the request. Whatever is returned by the callback is marshaled into a JSON string and sent via MQTT.
 */

/**
 * Handles requests on a certain channel or a certain set of channels
 *
 * @param {string} channel - the channel we want to listen for requests on. Can contain wildcard(s).
 * @param {handleCallback} callback - fired whenever a message is received
 * @param {string} appId - used to pad channels
 * @param {string} runId - used to pad channels
 * @param {function} done_callback - fired whenever we are ready to handle requests
 */
AbstractNet.prototype.handle_requests_on = function( channel, callback, appId, runId, done_callback) {
    // Pad channel
    var padded_channel = pad_channel(channel, appId, runId);
    var mqtt_cb = function(request) {
        try {
            // Extract nutella fields
            var f = extract_fields_from_message(request);
            // Only handle requests that have proper id set
            if(f.type!=='request' || f.id===undefined) return;
            // Execute callback and send response
            var m = prepare_message_for_response(callback(f.payload, f.from), f.id, this.nutella);
            this.nutella.mqtt_client.publish( padded_channel, m );
        } catch(e) {
            if (e instanceof SyntaxError) {
                // Message is not JSON, drop it
            } else {
                // Bubble up whatever exception is thrown
                throw e;
            }
        }
    };
    // Subscribe to the channel
    this.nutella.mqtt_client.subscribe(padded_channel, mqtt_cb, done_callback)
};



// -------------------------------------------------------------------------------------------------------------
// Private utility functions

function extract_fields_from_message(message) {
    return JSON.parse(message);
}

function pad_channel(channel, app_id, run_id) {
    if (run_id!==undefined && app_id===undefined)
        throw 'If the run_id is specified, app_id needs to also be specified';
    if (app_id===undefined && run_id===undefined)
        return '/nutella/' + channel;
    if (app_id!==undefined && run_id===undefined)
        return '/nutella/apps/' + app_id + '/#{channel}';
    return '/nutella/apps/' + app_id + '/runs/' + run_id + '/' + channel;

}

function un_pad_channel(channel, app_id, run_id) {
    if (run_id!==undefined && app_id===undefined)
        throw 'If the run_id is specified, app_id needs to also be specified';
    if (app_id===undefined && run_id===undefined)
        return channel.replace('/nutella/', '');
    if (app_id!==undefined && run_id===undefined)
        return channel.replace("/nutella/apps/" + app_id + "/", '');
    return channel.replace("/nutella/apps/" + app_id + "/runs/" + run_id + "/", '');
}


function assemble_from(n) {
    var from = {};
    if(n.run_id===undefined) {
        if(n.appId===undefined) {
            from.type = 'framework';
        } else {
            from.type = 'app';
            from.app_id = n.appId;
        }
    } else {
        from.type = 'run';
        from.run_id = n.runId;
    }
    from.component_id = n.componentId;
    if (n.resourceId!==undefined)
        from.resource_id = n.resourceId;
    return from;
}


function prepare_message_for_publish(message, n) {
    if(message===undefined)
        return JSON.stringify({type: 'publish', from: assemble_from(n)});
    return JSON.stringify({type: 'publish', from: assemble_from(n), payload: message});
}


function prepare_message_for_request(message, n) {
    var id = Math.floor((Math.random() * 100000) + 1).toString();
    var m = {};
    m.id = id;
    if(message===undefined)
        m.message = JSON.stringify({id: id, type: 'request', from: assemble_from(n)});
    else
        m.message = JSON.stringify({id: id, type: 'request', from: assemble_from(n), payload: message});
    return m;
}


function prepare_message_for_response(message, id, n) {
    if(message===undefined)
        return JSON.stringify({id: id, type: 'response', from: assemble_from(n)});
    return JSON.stringify({id: id, type: 'response', from: assemble_from(n), payload: message});
}



// Export module
module.exports = AbstractNet;