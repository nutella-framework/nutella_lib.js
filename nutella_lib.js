//     nutella_lib.js 0.1.0
 
(function() {
	"use strict";
 
  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;
 
  // Save the previous value of the `nutella` variable for noConflict().
  var previousNutella = root.nutella;
  
  // Create a safe reference to the nutella object for use below.
  var nutella = function(obj) {
    if (obj instanceof 'nutella') return obj;
    if (!(this instanceof 'nutella')) return new 'nutella'(obj);
    this._wrapped = obj;
  };
	
	// No conflict method
	nutella.noConflict = function() {
	  root.nutella = previousNutella
	  return nutella
	};
 
  // Export the nutella object for node.js, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `nutella` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = nutella;
    }
    exports.nutella = nutella;
  } else {
    root.nutella = nutella;
  }
 
  // Current version.
  nutella.VERSION = '0.2.0';
	
	// Mark nutella instance as un-initialized
	nutella.initialized = false;
 
 
  // Test function
	nutella.test = function(param) {
		return "test"
	};
	
	// Initialized nutella
	nutella.init = function(args, callback) {
		var params = parseURLParams(args);
		if (params === undefined) {
			console.warn("Couldn't initialize nutella. Make sure you are passing the right parameters in the URL query string: 'run_id' and 'broker'")
			// TODO try to read from command line. We could be in node trying to pass parameters via Command Line
		}
		// Connect to MQTT. Id generated randomly.
		// TODO, change this to read from nutella.json
		nutella.actor_name = MQTT.connect(params.broker, function() {
			// Once connection is established, we can execute operations on it
			nutella.initialized = true;
			if (callback!==undefined) {
				callback();
			}
		});
		return params;
	}	
	
	
	// Utility function: parses URL parameters
	// Returns undefined if run_id and/or broker are not defined
	function parseURLParams(str) {
		var queries = str.replace(/^\?/, '').split('&');
		var searchObject = {};
    for( var i = 0; i < queries.length; i++ ) {
        var split = queries[i].split('=');
        searchObject[split[0]] = split[1];
    }
		// Check if run_id and broker are defined
		if (searchObject.run_id===undefined || searchObject.broker===undefined) {
			return undefined;
		}
		nutella.run_id = searchObject.run_id;
		return searchObject;
	}
	
	// Utility function: generated actor id
	// Extracts the actor name from nutella.json file and appends it to the run_id
	// function configActorName() {
	//     h = JSON.parse( IO.read( "nutella.json" ) )
	//     full_actor_name = run_id + '_' + h["name"]
	//     full_actor_name[0, 23]	
	//
	// 	}
	
	
	// TODO put these functions into a separate submodule
	
	// Subscribe to a channel
  // The callback takes one parameter and that is the message that is received.
  // Messages that are not JSON are discarded.
 	nutella.subscribe = function(channel, callback, done_callback) {
		// Check nutella is initialized
		if (!nutella.initialized) {
			console.warn("Can't call any methods because nutella is not initialized");
			return;
		}
		// Pad the channel
		var new_channel = nutella.run_id + '/' + channel;
		// Subscribe
		MQTT.subscribe(new_channel, function(message) {
			// Make sure the message is JSON, if not drop the message
			try {
				var message_obj = JSON.parse(message);
				callback(message_obj);
			}
			catch(err) {
				// do nothing, just discard the message
			}
		}, done_callback);
 	}
	
	// Unsubscribe from a channel
	nutella.unsubscribe = function(channel, done_callback) {
    // Pad the channel
    var new_channel = nutella.run_id + '/' + channel;
    // Unsubscribe
    MQTT.unsubscribe(new_channel, done_callback);	
	}
	
	
	// Publishes a message to a channel
	// Message can be:
	// empty (optional parameter)
	// string (the string will be wrapped into a JSON string automatically. Format: {"payload":"<message>"})
	// object (the object will be converted into a JSON string automatically)
	// json string (the JSON string will be sent as is)
	nutella.publish = function(channel, message) {
    // Pad the channel
    var new_channel = nutella.run_id + '/' + channel;
		// Publish
		var m = attach_to_message(message, "from", nutella.actor_name);
		MQTT.publish(new_channel, m);
	}
	
	
	// Performs an asynchronosus request
	// Message can be:
	// empty (equivalent of a GET)
	// string (the string will be wrapped into a JSON string automatically. Format: {"payload":"<message>"})
	// hash (the hash will be converted into a JSON string automatically)
	// json string (the JSON string will be sent as is)
	nutella.request = function(channel, message, callback, done_callback) {
    if (Object.prototype.toString.call(message) == "[object Function]") {
			done_callback = callback;
      callback = message;
			message = undefined;
    }
    // Generate unique id for request
    var id = Math.floor(Math.random()*10000);
    // Attach id
		var payload = attach_to_message(message, "id", id);
    //Initialize flag that prevents handling of our own messages
    var ready_to_go = false
    //Register callback to handle data the request response whenever it comes
		nutella.subscribe(channel, function(res) {
			// Check that the message we receive is not the one we are sending ourselves.
			if (res.id===id) {
        if (ready_to_go) {
					nutella.unsubscribe(channel);
					callback(res);
        } else {
        	ready_to_go = true;
        }
			}
		}, function() {
	    // Send message
	    nutella.publish(channel, payload);
			// If there is a done_callback defined, execute it
			if (done_callback!==undefined) {
				done_callback();
			}
		}); 
	}
	
		
	function attach_to_message(message, key, val) {
		var payload;
		if (message===undefined) {
			var p = {};
			p[key] = val;
			payload = JSON.stringify(p);
		} else if (is_json_string(message)) {
		  var p = JSON.parse(message);
		  p[key] = val;
		 	payload = JSON.stringify(p);
		} else if (typeof message === 'string') {
			var p = {};
			p.payload = message;
			p[key] = val;
			payload = JSON.stringify(p);
		} else {
			// any other object
			message[key] = val;
			payload = JSON.stringify(message);
		}
		return payload;
	}
	
	function is_json_string(str) {
		try {
		   JSON.parse(str);
		} catch(e) {
		   return false;
		}
		return true;
	}
  
  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules.
  if (typeof define === 'function' && define.amd) {
    define('nutella_lib', [], function() {
      return nutella;
    });
  }
}.call(this));
