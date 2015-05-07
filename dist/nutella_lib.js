(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.NUTELLA = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/******************
 * nutella_lib.js *
 ******************/

"use strict";

/**
 * Entry point for nutella_lib in the browser
 */

var nutella_i = require('./nutella_i_browser');
var nutella_version = require('./version');

// Internal reference to this library (used below)
var nutella = {};

// Version number
nutella.version = nutella_version.version;


/**
 * Creates a new instance of nutella
 * and initialize it. This is a factory method.
 *
 * @param {string} broker_hostname - the hostname of the broker.*
 * @param {string} app_id - the app_id this component belongs to
 * @param {string} run_id - the run_id this component is launched in
 * @param {string} component_id - the name of this component
 */
nutella.init = function(broker_hostname, app_id, run_id, component_id) {
    if (broker_hostname===undefined || app_id===undefined || run_id===undefined || component_id=== undefined) {
        console.warn("Couldn't initialize nutella. Make sure you are setting all four required parameters (broker_hostname, app_id, run_id, component_id)");
    }
    return new nutella_i.RunNutellaInstance(broker_hostname, app_id, run_id, component_id);
};


/**
 * Creates a new instance of nutella
 * and initialize it for an app-level component.
 * This is a factory method.
 *
 * @param {string} broker_hostname - the hostname of the broker.*
 * @param {string} app_id - the app_id this component belongs to
 * @param {string} component_id - the name of this component
 */
nutella.initApp = function(broker_hostname, app_id, component_id) {
    if (broker_hostname===undefined || app_id===undefined || component_id=== undefined) {
        console.warn("Couldn't initialize nutella. Make sure you are setting all three required parameters (broker_hostname, app_id, component_id)");
    }
    return new nutella_i.AppNutellaInstance(broker_hostname, app_id, component_id);
};


/**
 * Creates a new instance of nutella
 * and initialize it for a framework-level component.
 * This is a factory method.
 *
 * @param {string} broker_hostname - the hostname of the broker.*
 * @param {string} component_id - the name of this component
 */
nutella.initFramework = function(broker_hostname, component_id) {
    if (broker_hostname===undefined || component_id=== undefined) {
        console.warn("Couldn't initialize nutella. Make sure you are setting all two required parameters (broker_hostname, component_id)");
    }
    return new nutella_i.FrNutellaInstance(broker_hostname, component_id);
};



/**
 * Utility method that parses URL parameters from the URL.
 *
 * @return {Object} An object containing all the URL query parameters
 */
nutella.parseURLParameters = function () {
    var str = location.search;
    var queries = str.replace(/^\?/, '').split('&');
    var searchObject = {};
    for( var i = 0; i < queries.length; i++ ) {
        var split = queries[i].split('=');
        searchObject[split[0]] = split[1];
    }
    return searchObject;
};


/**
 * Utility method that parses the component ID from the URL.
 *
 * @return {String} the componentId of this component
 */
nutella.parseComponentId = function() {
    return location.pathname.split('/')[4];
};



// Exports nutella object
module.exports = nutella;
},{"./nutella_i_browser":11,"./version":17}],2:[function(require,module,exports){
/**********************
 * Simple MQTT client *
 **********************/

"use strict";

var mqtt_lib = require('./paho/mqttws31-min');



/**
 * Defines a Simple MQTT client.
 *
 * @param {string} host - the hostname of the broker.
 * @param {string} [clientId]  - the unique name of this client. If no ID is provided a random one is generated
 */
var SimpleMQTTClient = function (host, clientId) {
    // Initializes the object that stores subscriptions
    this.subscriptions = {};
    // Initializes the object that holds the internal client
    this.client = {};
    // Functions backlog
    this.backlog = [];
    // Handles the optional clientId parameter
    if (arguments.length === 1 || clientId === undefined) {
        clientId = generateRandomClientId();
    }
    // Connect
    this.client = connectBrowser(this.subscriptions, this.backlog, host, clientId);
};

//
// Helper function that generates a random client ID
//
function generateRandomClientId () {
    var length = 22;
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) {
        result += chars[Math.round(Math.random() * (chars.length - 1))];
    }
    return result;
};

//
// Helper function that connects the MQTT client in the browser
//
function connectBrowser (subscriptions, backlog, host, clientId) {
    // Create client
    var client = new mqtt_lib.Client(host, Number(1884), clientId);
    // Register callback for connection lost
    client.onConnectionLost = function() {
        // TODO try to reconnect
    };
    // Register callback for received message
    client.onMessageArrived = function (message) {
        // Execute all the appropriate callbacks:
        // the ones specific to this channel with a single parameter (message)
        // the ones associated to a wildcard channel, with two parameters (message and channel)
        var cbs = findCallbacks(subscriptions, message.destinationName);
        if (cbs!==undefined) {
            cbs.forEach(function(cb) {
                if (Object.keys(subscriptions).indexOf(message.destinationName)!==-1)
                    cb(message.payloadString);
                else
                    cb(message.payloadString, message.destinationName);
            });
        }
    };
    // Connect
    client.connect({onSuccess: function() {
        // Execute the backlog of operations performed while the client wasn't connected
        backlog.forEach(function(e) {
            e.op.apply(this, e.params);
        });
    }});
    return client;
}



/**
 * Disconnects from the MQTT client.
 */
SimpleMQTTClient.prototype.disconnect = function () {
    this.client.disconnect();
    this.subscriptions = {};
};



/**
 * Subscribes to a channel and registers a callback.
 *
 * @param {string} channel  - the channel we are subscribing to.
 * @param {callback} callback - A function that is executed every time a message is received on that channel.
 * @param {callback} [done_callback] - A function that is executed once the subscribe operation has completed successfully.
 */
SimpleMQTTClient.prototype.subscribe = function (channel, callback, done_callback) {
    subscribeBrowser(this.client, this.subscriptions, this.backlog, channel, callback, done_callback);
};


//
// Helper function that subscribes to a channel in the browser
//
function subscribeBrowser (client, subscriptions, backlog, channel, callback, done_callback) {
    if ( addToBacklog(client, backlog, subscribeBrowser, [client, subscriptions, backlog, channel, callback, done_callback]) ) return;
    if (subscriptions[channel]===undefined) {
        subscriptions[channel] = [callback];
        client.subscribe(channel, {qos: 0, onSuccess: function() {
            // If there is a done_callback defined, execute it
            if (done_callback!==undefined) done_callback();
        }});
    } else {
        subscriptions[channel].push(callback);
        // If there is a done_callback defined, execute it
        if (done_callback!==undefined) done_callback();
    }
}



/**
 * Unsubscribe from a channel.
 *
 * @param {string} channel  - the channel we are unsubscribing from.
 * @param {function} callback  - the callback we are trying to unregister
 * @param {callback} [done_callback] - A function that is executed once the unsubscribe operation has completed successfully.
 */
SimpleMQTTClient.prototype.unsubscribe = function (channel, callback, done_callback) {
    unsubscribeBrowser(this.client, this.subscriptions, this.backlog, channel, callback, done_callback);
};




//
// Helper function that unsubscribes from a channel in the browser
//
var unsubscribeBrowser = function(client, subscriptions, backlog, channel, callback, done_callback) {
    if ( addToBacklog(client, backlog, unsubscribeBrowser, [client, subscriptions, backlog, channel, callback, done_callback]) ) return;
    if (subscriptions[channel]===undefined)
        return;
    subscriptions[channel].splice(subscriptions[channel].indexOf(callback), 1);
    if (subscriptions[channel].length===0) {
        delete subscriptions[channel];
        client.unsubscribe(channel, {onSuccess : function() {
            // If there is a done_callback defined, execute it
            if (done_callback!==undefined) done_callback();
        }});
    }
};


/**
 * Lists all the channels we are currently subscribed to.
 *
 * @returns {Array} a lists of all the channels we are currently subscribed to.
 */
SimpleMQTTClient.prototype.getSubscriptions = function () {
    return Object.keys(this.subscriptions);
};


/**
 * Publishes a message to a channel.
 *
 * @param {string} channel  - the channel we are publishing to.
 * @param {string} message - the message we are publishing.
 */
SimpleMQTTClient.prototype.publish = function (channel, message) {
    publishBrowser(this.client, this.backlog, channel, message)
};


//
// Helper function that publishes to a channel in the browser
//
var publishBrowser = function (client, backlog, channel, message) {
    if ( addToBacklog(client, backlog, publishBrowser, [client, backlog, channel, message]) ) return;
    message = new mqtt_lib.Message(message);
    message.destinationName = channel;
    client.send(message);
};


/**
 * Determines if a channel is wildcard or not.
 *
 * @param channel
 * @return {boolean} true if the channel is a wildcard channel, false otherwise
 */
SimpleMQTTClient.prototype.isChannelWildcard = function(channel) {
    return channel.indexOf('#')>-1 || channel.indexOf('+')>-1 ;
}


/**
 * Returns the client host
 *
 * @return {String}
 */
SimpleMQTTClient.prototype.getHost = function() {
    return this.client._getHost();
}






//
// Helper function that selects the right callback when a message is received
//
function findCallbacks (subscriptions, channel) {
    // First try to see if a callback for the exact channel exists
    if(Object.keys(subscriptions).indexOf(channel)!==-1)
        return subscriptions[channel];
    // If it doesn't then let's try to see if the channel matches a wildcard callback
    var pattern = matchesWildcard(subscriptions, channel);
    if (pattern!== undefined) {
        return subscriptions[pattern];
    }
    // If there's no exact match or wildcard we have to return undefined
    return undefined;
};


//
// Helper function that tries to match a channel with each subscription
// it returns undefined if no match is found
//
function matchesWildcard (subscriptions, channel) {
    var i;
    var subs = Object.keys(subscriptions);
    for (i=0; i < subs.length; i++) {
        if (matchesFilter(subs[i], channel)) {
            return subs[i];
        }
    }
    return undefined;
};


//
// Helper function that checks a certain channel and see if it matches a wildcard pattern
// Returns true if the channel matches a pattern (including the exact pattern)
//
function matchesFilter (pattern, channel) {
    // If multi-level wildcard is the only character in pattern, then any string will match
    if (pattern==="#") {
        return true;
    }
    // Handle all other multi-level wildcards
    // FROM SPEC: The number sign (‘#’ U+0023) is a wildcard character that matches any number of levels within a topic. The multi-level wildcard represents the parent and any number of child levels. The multi-level wildcard character MUST be specified either on its own or following a topic level separator. In either case it MUST be the last character specified in the Topic Filter
    var p_wo_wildcard = pattern.substring(0, pattern.length-2);
    var str_wo_details = channel.substring(0, pattern.length-2);
    if (pattern.slice(-1)=='#' && p_wo_wildcard==str_wo_details) {
        return true;
    }
    // TODO Handle single-level wildcards (+)
    // FROM SPEC: The single-level wildcard can be used at any level in the Topic Filter, including first and last levels. Where it is used it MUST occupy an entire level of the filter [MQTT-4.7.1-3]. It can be used at more than one level in the Topic Filter and can be used in conjunction with the multilevel wildcard.
    // http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Toc398718107
    return false;
};


//
// Helper method that queues operations into the backlog.
// This method is used to make `connect` "synchronous" by
// queueing up operations on the client until it is connected.
//
// @param {string} method  - the method that needs to be added to the backlog
// @param {Array} parameters - parameters to the method being added to the backlog
// @returns {boolean} true if the method was successfully added, false otherwise
//
function addToBacklog (client, backlog, method, parameters) {
    if (!client.isConnected() ) {
        backlog.push({
            op : method,
            params : parameters
        });
        return true;
    }
    return false;
};




//
// Exports SimpleMQTTClient class for other modules
//
module.exports = SimpleMQTTClient;

},{"./paho/mqttws31-min":3}],3:[function(require,module,exports){
/*******************************************************************************
 * Copyright (c) 2013, 2014 IBM Corp.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * and Eclipse Distribution License v1.0 which accompany this distribution. 
 *
 * The Eclipse Public License is available at 
 *    http://www.eclipse.org/legal/epl-v10.html
 * and the Eclipse Distribution License is available at 
 *   http://www.eclipse.org/org/documents/edl-v10.php.
 *
 *******************************************************************************/

if(typeof Paho==="undefined"){Paho={}}Paho.MQTT=(function(r){var h="1.0.1";var k="2014-11-18T11:57:44Z";var o={CONNECT:1,CONNACK:2,PUBLISH:3,PUBACK:4,PUBREC:5,PUBREL:6,PUBCOMP:7,SUBSCRIBE:8,SUBACK:9,UNSUBSCRIBE:10,UNSUBACK:11,PINGREQ:12,PINGRESP:13,DISCONNECT:14};var m=function(C,B){for(var z in C){if(C.hasOwnProperty(z)){if(B.hasOwnProperty(z)){if(typeof C[z]!==B[z]){throw new Error(u(j.INVALID_TYPE,[typeof C[z],z]))}}else{var A="Unknown property, "+z+". Valid properties are:";for(var z in B){if(B.hasOwnProperty(z)){A=A+" "+z}}throw new Error(A)}}}};var b=function(A,z){return function(){return A.apply(z,arguments)}};var j={OK:{code:0,text:"AMQJSC0000I OK."},CONNECT_TIMEOUT:{code:1,text:"AMQJSC0001E Connect timed out."},SUBSCRIBE_TIMEOUT:{code:2,text:"AMQJS0002E Subscribe timed out."},UNSUBSCRIBE_TIMEOUT:{code:3,text:"AMQJS0003E Unsubscribe timed out."},PING_TIMEOUT:{code:4,text:"AMQJS0004E Ping timed out."},INTERNAL_ERROR:{code:5,text:"AMQJS0005E Internal error. Error Message: {0}, Stack trace: {1}"},CONNACK_RETURNCODE:{code:6,text:"AMQJS0006E Bad Connack return code:{0} {1}."},SOCKET_ERROR:{code:7,text:"AMQJS0007E Socket error:{0}."},SOCKET_CLOSE:{code:8,text:"AMQJS0008I Socket closed."},MALFORMED_UTF:{code:9,text:"AMQJS0009E Malformed UTF data:{0} {1} {2}."},UNSUPPORTED:{code:10,text:"AMQJS0010E {0} is not supported by this browser."},INVALID_STATE:{code:11,text:"AMQJS0011E Invalid state {0}."},INVALID_TYPE:{code:12,text:"AMQJS0012E Invalid type {0} for {1}."},INVALID_ARGUMENT:{code:13,text:"AMQJS0013E Invalid argument {0} for {1}."},UNSUPPORTED_OPERATION:{code:14,text:"AMQJS0014E Unsupported operation."},INVALID_STORED_DATA:{code:15,text:"AMQJS0015E Invalid data in local storage key={0} value={1}."},INVALID_MQTT_MESSAGE_TYPE:{code:16,text:"AMQJS0016E Invalid MQTT message type {0}."},MALFORMED_UNICODE:{code:17,text:"AMQJS0017E Malformed Unicode string:{0} {1}."},};var f={0:"Connection Accepted",1:"Connection Refused: unacceptable protocol version",2:"Connection Refused: identifier rejected",3:"Connection Refused: server unavailable",4:"Connection Refused: bad user name or password",5:"Connection Refused: not authorized"};var u=function(z,B){var F=z.text;if(B){var E,G;for(var A=0;A<B.length;A++){E="{"+A+"}";G=F.indexOf(E);if(G>0){var D=F.substring(0,G);var C=F.substring(G+E.length);F=D+B[A]+C}}}return F};var e=[0,6,77,81,73,115,100,112,3];var d=[0,4,77,81,84,84,4];var q=function(B,A){this.type=B;for(var z in A){if(A.hasOwnProperty(z)){this[z]=A[z]}}};q.prototype.encode=function(){var H=((this.type&15)<<4);var K=0;var A=new Array();var D=0;if(this.messageIdentifier!=undefined){K+=2}switch(this.type){case o.CONNECT:switch(this.mqttVersion){case 3:K+=e.length+3;break;case 4:K+=d.length+3;break}K+=c(this.clientId)+2;if(this.willMessage!=undefined){K+=c(this.willMessage.destinationName)+2;var C=this.willMessage.payloadBytes;if(!(C instanceof Uint8Array)){C=new Uint8Array(F)}K+=C.byteLength+2}if(this.userName!=undefined){K+=c(this.userName)+2}if(this.password!=undefined){K+=c(this.password)+2}break;case o.SUBSCRIBE:H|=2;for(var G=0;G<this.topics.length;G++){A[G]=c(this.topics[G]);K+=A[G]+2}K+=this.requestedQos.length;break;case o.UNSUBSCRIBE:H|=2;for(var G=0;G<this.topics.length;G++){A[G]=c(this.topics[G]);K+=A[G]+2}break;case o.PUBREL:H|=2;break;case o.PUBLISH:if(this.payloadMessage.duplicate){H|=8}H=H|=(this.payloadMessage.qos<<1);if(this.payloadMessage.retained){H|=1}D=c(this.payloadMessage.destinationName);K+=D+2;var F=this.payloadMessage.payloadBytes;K+=F.byteLength;if(F instanceof ArrayBuffer){F=new Uint8Array(F)}else{if(!(F instanceof Uint8Array)){F=new Uint8Array(F.buffer)}}break;case o.DISCONNECT:break;default:}var z=x(K);var J=z.length+1;var B=new ArrayBuffer(K+J);var I=new Uint8Array(B);I[0]=H;I.set(z,1);if(this.type==o.PUBLISH){J=t(this.payloadMessage.destinationName,D,I,J)}else{if(this.type==o.CONNECT){switch(this.mqttVersion){case 3:I.set(e,J);J+=e.length;break;case 4:I.set(d,J);J+=d.length;break}var E=0;if(this.cleanSession){E=2}if(this.willMessage!=undefined){E|=4;E|=(this.willMessage.qos<<3);if(this.willMessage.retained){E|=32}}if(this.userName!=undefined){E|=128}if(this.password!=undefined){E|=64}I[J++]=E;J=y(this.keepAliveInterval,I,J)}}if(this.messageIdentifier!=undefined){J=y(this.messageIdentifier,I,J)}switch(this.type){case o.CONNECT:J=t(this.clientId,c(this.clientId),I,J);if(this.willMessage!=undefined){J=t(this.willMessage.destinationName,c(this.willMessage.destinationName),I,J);J=y(C.byteLength,I,J);I.set(C,J);J+=C.byteLength}if(this.userName!=undefined){J=t(this.userName,c(this.userName),I,J)}if(this.password!=undefined){J=t(this.password,c(this.password),I,J)}break;case o.PUBLISH:I.set(F,J);break;case o.SUBSCRIBE:for(var G=0;G<this.topics.length;G++){J=t(this.topics[G],A[G],I,J);I[J++]=this.requestedQos[G]}break;case o.UNSUBSCRIBE:for(var G=0;G<this.topics.length;G++){J=t(this.topics[G],A[G],I,J)}break;default:}return B};function g(K,H){var F=H;var D=K[H];var G=D>>4;var z=D&=15;H+=1;var I;var J=0;var N=1;do{if(H==K.length){return[null,F]}I=K[H++];J+=((I&127)*N);N*=128}while((I&128)!=0);var B=H+J;if(B>K.length){return[null,F]}var L=new q(G);switch(G){case o.CONNACK:var C=K[H++];if(C&1){L.sessionPresent=true}L.returnCode=K[H++];break;case o.PUBLISH:var M=(z>>1)&3;var E=l(K,H);H+=2;var A=n(K,H,E);H+=E;if(M>0){L.messageIdentifier=l(K,H);H+=2}var O=new Paho.MQTT.Message(K.subarray(H,B));if((z&1)==1){O.retained=true}if((z&8)==8){O.duplicate=true}O.qos=M;O.destinationName=A;L.payloadMessage=O;break;case o.PUBACK:case o.PUBREC:case o.PUBREL:case o.PUBCOMP:case o.UNSUBACK:L.messageIdentifier=l(K,H);break;case o.SUBACK:L.messageIdentifier=l(K,H);H+=2;L.returnCode=K.subarray(H,B);break;default:}return[L,B]}function y(A,z,B){z[B++]=A>>8;z[B++]=A%256;return B}function t(A,B,z,C){C=y(B,z,C);i(A,z,C);return C+B}function l(z,A){return 256*z[A]+z[A+1]}function x(B){var z=new Array(1);var A=0;do{var C=B%128;B=B>>7;if(B>0){C|=128}z[A++]=C}while((B>0)&&(A<4));return z}function c(B){var A=0;for(var C=0;C<B.length;C++){var z=B.charCodeAt(C);if(z>2047){if(55296<=z&&z<=56319){C++;A++}A+=3}else{if(z>127){A+=2}else{A++}}}return A}function i(B,A,F){var E=F;for(var C=0;C<B.length;C++){var z=B.charCodeAt(C);if(55296<=z&&z<=56319){var D=B.charCodeAt(++C);if(isNaN(D)){throw new Error(u(j.MALFORMED_UNICODE,[z,D]))}z=((z-55296)<<10)+(D-56320)+65536}if(z<=127){A[E++]=z}else{if(z<=2047){A[E++]=z>>6&31|192;A[E++]=z&63|128}else{if(z<=65535){A[E++]=z>>12&15|224;A[E++]=z>>6&63|128;A[E++]=z&63|128}else{A[E++]=z>>18&7|240;A[E++]=z>>12&63|128;A[E++]=z>>6&63|128;A[E++]=z&63|128}}}}return A}function n(G,C,z){var A="";var B;var E=C;while(E<C+z){var I=G[E++];if(I<128){B=I}else{var H=G[E++]-128;if(H<0){throw new Error(u(j.MALFORMED_UTF,[I.toString(16),H.toString(16),""]))}if(I<224){B=64*(I-192)+H}else{var F=G[E++]-128;if(F<0){throw new Error(u(j.MALFORMED_UTF,[I.toString(16),H.toString(16),F.toString(16)]))}if(I<240){B=4096*(I-224)+64*H+F}else{var D=G[E++]-128;if(D<0){throw new Error(u(j.MALFORMED_UTF,[I.toString(16),H.toString(16),F.toString(16),D.toString(16)]))}if(I<248){B=262144*(I-240)+4096*H+64*F+D}else{throw new Error(u(j.MALFORMED_UTF,[I.toString(16),H.toString(16),F.toString(16),D.toString(16)]))}}}}if(B>65535){B-=65536;A+=String.fromCharCode(55296+(B>>10));B=56320+(B&1023)}A+=String.fromCharCode(B)}return A}var s=function(z,E,D){this._client=z;this._window=E;this._keepAliveInterval=D*1000;this.isReset=false;var C=new q(o.PINGREQ).encode();var B=function(F){return function(){return A.apply(F)}};var A=function(){if(!this.isReset){this._client._trace("Pinger.doPing","Timed out");this._client._disconnected(j.PING_TIMEOUT.code,u(j.PING_TIMEOUT))}else{this.isReset=false;this._client._trace("Pinger.doPing","send PINGREQ");this._client.socket.send(C);this.timeout=this._window.setTimeout(B(this),this._keepAliveInterval)}};this.reset=function(){this.isReset=true;this._window.clearTimeout(this.timeout);if(this._keepAliveInterval>0){this.timeout=setTimeout(B(this),this._keepAliveInterval)}};this.cancel=function(){this._window.clearTimeout(this.timeout)}};var w=function(z,D,B,E,A){this._window=D;if(!B){B=30}var C=function(H,F,G){return function(){return H.apply(F,G)}};this.timeout=setTimeout(C(E,z,A),B*1000);this.cancel=function(){this._window.clearTimeout(this.timeout)}};var v=function(D,C,A,E,z){if(!("WebSocket" in r&&r.WebSocket!==null)){throw new Error(u(j.UNSUPPORTED,["WebSocket"]))}if(!("localStorage" in r&&r.localStorage!==null)){throw new Error(u(j.UNSUPPORTED,["localStorage"]))}if(!("ArrayBuffer" in r&&r.ArrayBuffer!==null)){throw new Error(u(j.UNSUPPORTED,["ArrayBuffer"]))}this._trace("Paho.MQTT.Client",D,C,A,E,z);this.host=C;this.port=A;this.path=E;this.uri=D;this.clientId=z;this._localKey=C+":"+A+(E!="/mqtt"?":"+E:"")+":"+z+":";this._msg_queue=[];this._sentMessages={};this._receivedMessages={};this._notify_msg_sent={};this._message_identifier=1;this._sequence=0;for(var B in localStorage){if(B.indexOf("Sent:"+this._localKey)==0||B.indexOf("Received:"+this._localKey)==0){this.restore(B)}}};v.prototype.host;v.prototype.port;v.prototype.path;v.prototype.uri;v.prototype.clientId;v.prototype.socket;v.prototype.connected=false;v.prototype.maxMessageIdentifier=65536;v.prototype.connectOptions;v.prototype.hostIndex;v.prototype.onConnectionLost;v.prototype.onMessageDelivered;v.prototype.onMessageArrived;v.prototype.traceFunction;v.prototype._msg_queue=null;v.prototype._connectTimeout;v.prototype.sendPinger=null;v.prototype.receivePinger=null;v.prototype.receiveBuffer=null;v.prototype._traceBuffer=null;v.prototype._MAX_TRACE_ENTRIES=100;v.prototype.connect=function(A){var z=this._traceMask(A,"password");this._trace("Client.connect",z,this.socket,this.connected);if(this.connected){throw new Error(u(j.INVALID_STATE,["already connected"]))}if(this.socket){throw new Error(u(j.INVALID_STATE,["already connected"]))}this.connectOptions=A;if(A.uris){this.hostIndex=0;this._doConnect(A.uris[0])}else{this._doConnect(this.uri)}};v.prototype.subscribe=function(A,z){this._trace("Client.subscribe",A,z);if(!this.connected){throw new Error(u(j.INVALID_STATE,["not connected"]))}var B=new q(o.SUBSCRIBE);B.topics=[A];if(z.qos!=undefined){B.requestedQos=[z.qos]}else{B.requestedQos=[0]}if(z.onSuccess){B.onSuccess=function(C){z.onSuccess({invocationContext:z.invocationContext,grantedQos:C})}}if(z.onFailure){B.onFailure=function(C){z.onFailure({invocationContext:z.invocationContext,errorCode:C})}}if(z.timeout){B.timeOut=new w(this,window,z.timeout,z.onFailure,[{invocationContext:z.invocationContext,errorCode:j.SUBSCRIBE_TIMEOUT.code,errorMessage:u(j.SUBSCRIBE_TIMEOUT)}])}this._requires_ack(B);this._schedule_message(B)};v.prototype.unsubscribe=function(A,z){this._trace("Client.unsubscribe",A,z);if(!this.connected){throw new Error(u(j.INVALID_STATE,["not connected"]))}var B=new q(o.UNSUBSCRIBE);B.topics=[A];if(z.onSuccess){B.callback=function(){z.onSuccess({invocationContext:z.invocationContext})}}if(z.timeout){B.timeOut=new w(this,window,z.timeout,z.onFailure,[{invocationContext:z.invocationContext,errorCode:j.UNSUBSCRIBE_TIMEOUT.code,errorMessage:u(j.UNSUBSCRIBE_TIMEOUT)}])}this._requires_ack(B);this._schedule_message(B)};v.prototype.send=function(z){this._trace("Client.send",z);if(!this.connected){throw new Error(u(j.INVALID_STATE,["not connected"]))}wireMessage=new q(o.PUBLISH);wireMessage.payloadMessage=z;if(z.qos>0){this._requires_ack(wireMessage)}else{if(this.onMessageDelivered){this._notify_msg_sent[wireMessage]=this.onMessageDelivered(wireMessage.payloadMessage)}}this._schedule_message(wireMessage)};v.prototype.disconnect=function(){this._trace("Client.disconnect");if(!this.socket){throw new Error(u(j.INVALID_STATE,["not connecting or connected"]))}wireMessage=new q(o.DISCONNECT);this._notify_msg_sent[wireMessage]=b(this._disconnected,this);this._schedule_message(wireMessage)};v.prototype.getTraceLog=function(){if(this._traceBuffer!==null){this._trace("Client.getTraceLog",new Date());this._trace("Client.getTraceLog in flight messages",this._sentMessages.length);for(var z in this._sentMessages){this._trace("_sentMessages ",z,this._sentMessages[z])}for(var z in this._receivedMessages){this._trace("_receivedMessages ",z,this._receivedMessages[z])}return this._traceBuffer}};v.prototype.startTrace=function(){if(this._traceBuffer===null){this._traceBuffer=[]}this._trace("Client.startTrace",new Date(),h)};v.prototype.stopTrace=function(){delete this._traceBuffer};v.prototype._doConnect=function(A){if(this.connectOptions.useSSL){var z=A.split(":");z[0]="wss";A=z.join(":")}this.connected=false;if(this.connectOptions.mqttVersion<4){this.socket=new WebSocket(A,["mqttv3.1"])}else{this.socket=new WebSocket(A,["mqtt"])}this.socket.binaryType="arraybuffer";this.socket.onopen=b(this._on_socket_open,this);this.socket.onmessage=b(this._on_socket_message,this);this.socket.onerror=b(this._on_socket_error,this);this.socket.onclose=b(this._on_socket_close,this);this.sendPinger=new s(this,window,this.connectOptions.keepAliveInterval);this.receivePinger=new s(this,window,this.connectOptions.keepAliveInterval);this._connectTimeout=new w(this,window,this.connectOptions.timeout,this._disconnected,[j.CONNECT_TIMEOUT.code,u(j.CONNECT_TIMEOUT)])};v.prototype._schedule_message=function(z){this._msg_queue.push(z);if(this.connected){this._process_queue()}};v.prototype.store=function(E,D){var A={type:D.type,messageIdentifier:D.messageIdentifier,version:1};switch(D.type){case o.PUBLISH:if(D.pubRecReceived){A.pubRecReceived=true}A.payloadMessage={};var C="";var B=D.payloadMessage.payloadBytes;for(var z=0;z<B.length;z++){if(B[z]<=15){C=C+"0"+B[z].toString(16)}else{C=C+B[z].toString(16)}}A.payloadMessage.payloadHex=C;A.payloadMessage.qos=D.payloadMessage.qos;A.payloadMessage.destinationName=D.payloadMessage.destinationName;if(D.payloadMessage.duplicate){A.payloadMessage.duplicate=true}if(D.payloadMessage.retained){A.payloadMessage.retained=true}if(E.indexOf("Sent:")==0){if(D.sequence===undefined){D.sequence=++this._sequence}A.sequence=D.sequence}break;default:throw Error(u(j.INVALID_STORED_DATA,[key,A]))}localStorage.setItem(E+this._localKey+D.messageIdentifier,JSON.stringify(A))};v.prototype.restore=function(H){var G=localStorage.getItem(H);var F=JSON.parse(G);var I=new q(F.type,F);switch(F.type){case o.PUBLISH:var z=F.payloadMessage.payloadHex;var A=new ArrayBuffer((z.length)/2);var D=new Uint8Array(A);var B=0;while(z.length>=2){var E=parseInt(z.substring(0,2),16);z=z.substring(2,z.length);D[B++]=E}var C=new Paho.MQTT.Message(D);C.qos=F.payloadMessage.qos;C.destinationName=F.payloadMessage.destinationName;if(F.payloadMessage.duplicate){C.duplicate=true}if(F.payloadMessage.retained){C.retained=true}I.payloadMessage=C;break;default:throw Error(u(j.INVALID_STORED_DATA,[H,G]))}if(H.indexOf("Sent:"+this._localKey)==0){I.payloadMessage.duplicate=true;this._sentMessages[I.messageIdentifier]=I}else{if(H.indexOf("Received:"+this._localKey)==0){this._receivedMessages[I.messageIdentifier]=I}}};v.prototype._process_queue=function(){var A=null;var z=this._msg_queue.reverse();while((A=z.pop())){this._socket_send(A);if(this._notify_msg_sent[A]){this._notify_msg_sent[A]();delete this._notify_msg_sent[A]}}};v.prototype._requires_ack=function(A){var z=Object.keys(this._sentMessages).length;if(z>this.maxMessageIdentifier){throw Error("Too many messages:"+z)}while(this._sentMessages[this._message_identifier]!==undefined){this._message_identifier++}A.messageIdentifier=this._message_identifier;this._sentMessages[A.messageIdentifier]=A;if(A.type===o.PUBLISH){this.store("Sent:",A)}if(this._message_identifier===this.maxMessageIdentifier){this._message_identifier=1}};v.prototype._on_socket_open=function(){var z=new q(o.CONNECT,this.connectOptions);z.clientId=this.clientId;this._socket_send(z)};v.prototype._on_socket_message=function(B){this._trace("Client._on_socket_message",B.data);this.receivePinger.reset();var A=this._deframeMessages(B.data);for(var z=0;z<A.length;z+=1){this._handleMessage(A[z])}};v.prototype._deframeMessages=function(F){var A=new Uint8Array(F);if(this.receiveBuffer){var C=new Uint8Array(this.receiveBuffer.length+A.length);C.set(this.receiveBuffer);C.set(A,this.receiveBuffer.length);A=C;delete this.receiveBuffer}try{var G=0;var D=[];while(G<A.length){var z=g(A,G);var E=z[0];G=z[1];if(E!==null){D.push(E)}else{break}}if(G<A.length){this.receiveBuffer=A.subarray(G)}}catch(B){this._disconnected(j.INTERNAL_ERROR.code,u(j.INTERNAL_ERROR,[B.message,B.stack.toString()]));return}return D};v.prototype._handleMessage=function(I){this._trace("Client._handleMessage",I);try{switch(I.type){case o.CONNACK:this._connectTimeout.cancel();if(this.connectOptions.cleanSession){for(var H in this._sentMessages){var G=this._sentMessages[H];localStorage.removeItem("Sent:"+this._localKey+G.messageIdentifier)}this._sentMessages={};for(var H in this._receivedMessages){var z=this._receivedMessages[H];localStorage.removeItem("Received:"+this._localKey+z.messageIdentifier)}this._receivedMessages={}}if(I.returnCode===0){this.connected=true;if(this.connectOptions.uris){this.hostIndex=this.connectOptions.uris.length}}else{this._disconnected(j.CONNACK_RETURNCODE.code,u(j.CONNACK_RETURNCODE,[I.returnCode,f[I.returnCode]]));break}var E=new Array();for(var A in this._sentMessages){if(this._sentMessages.hasOwnProperty(A)){E.push(this._sentMessages[A])}}var E=E.sort(function(L,K){return L.sequence-K.sequence});for(var C=0,D=E.length;C<D;C++){var G=E[C];if(G.type==o.PUBLISH&&G.pubRecReceived){var B=new q(o.PUBREL,{messageIdentifier:G.messageIdentifier});this._schedule_message(B)}else{this._schedule_message(G)}}if(this.connectOptions.onSuccess){this.connectOptions.onSuccess({invocationContext:this.connectOptions.invocationContext})}this._process_queue();break;case o.PUBLISH:this._receivePublish(I);break;case o.PUBACK:var G=this._sentMessages[I.messageIdentifier];if(G){delete this._sentMessages[I.messageIdentifier];localStorage.removeItem("Sent:"+this._localKey+I.messageIdentifier);if(this.onMessageDelivered){this.onMessageDelivered(G.payloadMessage)}}break;case o.PUBREC:var G=this._sentMessages[I.messageIdentifier];if(G){G.pubRecReceived=true;var B=new q(o.PUBREL,{messageIdentifier:I.messageIdentifier});this.store("Sent:",G);this._schedule_message(B)}break;case o.PUBREL:var z=this._receivedMessages[I.messageIdentifier];localStorage.removeItem("Received:"+this._localKey+I.messageIdentifier);if(z){this._receiveMessage(z);delete this._receivedMessages[I.messageIdentifier]}var J=new q(o.PUBCOMP,{messageIdentifier:I.messageIdentifier});this._schedule_message(J);break;case o.PUBCOMP:var G=this._sentMessages[I.messageIdentifier];delete this._sentMessages[I.messageIdentifier];localStorage.removeItem("Sent:"+this._localKey+I.messageIdentifier);if(this.onMessageDelivered){this.onMessageDelivered(G.payloadMessage)}break;case o.SUBACK:var G=this._sentMessages[I.messageIdentifier];if(G){if(G.timeOut){G.timeOut.cancel()}I.returnCode.indexOf=Array.prototype.indexOf;if(I.returnCode.indexOf(128)!==-1){if(G.onFailure){G.onFailure(I.returnCode)}}else{if(G.onSuccess){G.onSuccess(I.returnCode)}}delete this._sentMessages[I.messageIdentifier]}break;case o.UNSUBACK:var G=this._sentMessages[I.messageIdentifier];if(G){if(G.timeOut){G.timeOut.cancel()}if(G.callback){G.callback()}delete this._sentMessages[I.messageIdentifier]}break;case o.PINGRESP:this.sendPinger.reset();break;case o.DISCONNECT:this._disconnected(j.INVALID_MQTT_MESSAGE_TYPE.code,u(j.INVALID_MQTT_MESSAGE_TYPE,[I.type]));break;default:this._disconnected(j.INVALID_MQTT_MESSAGE_TYPE.code,u(j.INVALID_MQTT_MESSAGE_TYPE,[I.type]))}}catch(F){this._disconnected(j.INTERNAL_ERROR.code,u(j.INTERNAL_ERROR,[F.message,F.stack.toString()]));return}};v.prototype._on_socket_error=function(z){this._disconnected(j.SOCKET_ERROR.code,u(j.SOCKET_ERROR,[z.data]))};v.prototype._on_socket_close=function(){this._disconnected(j.SOCKET_CLOSE.code,u(j.SOCKET_CLOSE))};v.prototype._socket_send=function(A){if(A.type==1){var z=this._traceMask(A,"password");this._trace("Client._socket_send",z)}else{this._trace("Client._socket_send",A)}this.socket.send(A.encode());this.sendPinger.reset()};v.prototype._receivePublish=function(B){switch(B.payloadMessage.qos){case"undefined":case 0:this._receiveMessage(B);break;case 1:var z=new q(o.PUBACK,{messageIdentifier:B.messageIdentifier});this._schedule_message(z);this._receiveMessage(B);break;case 2:this._receivedMessages[B.messageIdentifier]=B;this.store("Received:",B);var A=new q(o.PUBREC,{messageIdentifier:B.messageIdentifier});this._schedule_message(A);break;default:throw Error("Invaild qos="+wireMmessage.payloadMessage.qos)}};v.prototype._receiveMessage=function(z){if(this.onMessageArrived){this.onMessageArrived(z.payloadMessage)}};v.prototype._disconnected=function(A,z){this._trace("Client._disconnected",A,z);this.sendPinger.cancel();this.receivePinger.cancel();if(this._connectTimeout){this._connectTimeout.cancel()}this._msg_queue=[];this._notify_msg_sent={};if(this.socket){this.socket.onopen=null;this.socket.onmessage=null;this.socket.onerror=null;this.socket.onclose=null;if(this.socket.readyState===1){this.socket.close()}delete this.socket}if(this.connectOptions.uris&&this.hostIndex<this.connectOptions.uris.length-1){this.hostIndex++;this._doConnect(this.connectOptions.uris[this.hostIndex])}else{if(A===undefined){A=j.OK.code;z=u(j.OK)}if(this.connected){this.connected=false;if(this.onConnectionLost){this.onConnectionLost({errorCode:A,errorMessage:z})}}else{if(this.connectOptions.mqttVersion===4&&this.connectOptions.mqttVersionExplicit===false){this._trace("Failed to connect V4, dropping back to V3");this.connectOptions.mqttVersion=3;if(this.connectOptions.uris){this.hostIndex=0;this._doConnect(this.connectOptions.uris[0])}else{this._doConnect(this.uri)}}else{if(this.connectOptions.onFailure){this.connectOptions.onFailure({invocationContext:this.connectOptions.invocationContext,errorCode:A,errorMessage:z})}}}}};v.prototype._trace=function(){if(this.traceFunction){for(var B in arguments){if(typeof arguments[B]!=="undefined"){arguments[B]=JSON.stringify(arguments[B])}}var A=Array.prototype.slice.call(arguments).join("");this.traceFunction({severity:"Debug",message:A})}if(this._traceBuffer!==null){for(var B=0,z=arguments.length;B<z;B++){if(this._traceBuffer.length==this._MAX_TRACE_ENTRIES){this._traceBuffer.shift()}if(B===0){this._traceBuffer.push(arguments[B])}else{if(typeof arguments[B]==="undefined"){this._traceBuffer.push(arguments[B])}else{this._traceBuffer.push("  "+JSON.stringify(arguments[B]))}}}}};v.prototype._traceMask=function(B,A){var C={};for(var z in B){if(B.hasOwnProperty(z)){if(z==A){C[z]="******"}else{C[z]=B[z]}}}return C};var p=function(I,C,J,z){var B;if(typeof I!=="string"){throw new Error(u(j.INVALID_TYPE,[typeof I,"host"]))}if(arguments.length==2){z=C;B=I;var F=B.match(/^(wss?):\/\/((\[(.+)\])|([^\/]+?))(:(\d+))?(\/.*)$/);if(F){I=F[4]||F[2];C=parseInt(F[7]);J=F[8]}else{throw new Error(u(j.INVALID_ARGUMENT,[I,"host"]))}}else{if(arguments.length==3){z=J;J="/mqtt"}if(typeof C!=="number"||C<0){throw new Error(u(j.INVALID_TYPE,[typeof C,"port"]))}if(typeof J!=="string"){throw new Error(u(j.INVALID_TYPE,[typeof J,"path"]))}var A=(I.indexOf(":")!=-1&&I.slice(0,1)!="["&&I.slice(-1)!="]");B="ws://"+(A?"["+I+"]":I)+":"+C+J}var G=0;for(var E=0;E<z.length;E++){var H=z.charCodeAt(E);if(55296<=H&&H<=56319){E++}G++}if(typeof z!=="string"||G>65535){throw new Error(u(j.INVALID_ARGUMENT,[z,"clientId"]))}var D=new v(B,I,C,J,z);this._getHost=function(){return I};this._setHost=function(){throw new Error(u(j.UNSUPPORTED_OPERATION))};this._getPort=function(){return C};this._setPort=function(){throw new Error(u(j.UNSUPPORTED_OPERATION))};this._getPath=function(){return J};this._setPath=function(){throw new Error(u(j.UNSUPPORTED_OPERATION))};this._getURI=function(){return B};this._setURI=function(){throw new Error(u(j.UNSUPPORTED_OPERATION))};this._getClientId=function(){return D.clientId};this._setClientId=function(){throw new Error(u(j.UNSUPPORTED_OPERATION))};this._getOnConnectionLost=function(){return D.onConnectionLost};this._setOnConnectionLost=function(K){if(typeof K==="function"){D.onConnectionLost=K}else{throw new Error(u(j.INVALID_TYPE,[typeof K,"onConnectionLost"]))}};this._getOnMessageDelivered=function(){return D.onMessageDelivered};this._setOnMessageDelivered=function(K){if(typeof K==="function"){D.onMessageDelivered=K}else{throw new Error(u(j.INVALID_TYPE,[typeof K,"onMessageDelivered"]))}};this._getOnMessageArrived=function(){return D.onMessageArrived};this._setOnMessageArrived=function(K){if(typeof K==="function"){D.onMessageArrived=K}else{throw new Error(u(j.INVALID_TYPE,[typeof K,"onMessageArrived"]))}};this._getTrace=function(){return D.traceFunction};this._setTrace=function(K){if(typeof K==="function"){D.traceFunction=K}else{throw new Error(u(j.INVALID_TYPE,[typeof K,"onTrace"]))}};this.connect=function(N){N=N||{};m(N,{timeout:"number",userName:"string",password:"string",willMessage:"object",keepAliveInterval:"number",cleanSession:"boolean",useSSL:"boolean",invocationContext:"object",onSuccess:"function",onFailure:"function",hosts:"object",ports:"object",mqttVersion:"number"});if(N.keepAliveInterval===undefined){N.keepAliveInterval=60}if(N.mqttVersion>4||N.mqttVersion<3){throw new Error(u(j.INVALID_ARGUMENT,[N.mqttVersion,"connectOptions.mqttVersion"]))}if(N.mqttVersion===undefined){N.mqttVersionExplicit=false;N.mqttVersion=4}else{N.mqttVersionExplicit=true}if(N.password===undefined&&N.userName!==undefined){throw new Error(u(j.INVALID_ARGUMENT,[N.password,"connectOptions.password"]))}if(N.willMessage){if(!(N.willMessage instanceof a)){throw new Error(u(j.INVALID_TYPE,[N.willMessage,"connectOptions.willMessage"]))}N.willMessage.stringPayload;if(typeof N.willMessage.destinationName==="undefined"){throw new Error(u(j.INVALID_TYPE,[typeof N.willMessage.destinationName,"connectOptions.willMessage.destinationName"]))}}if(typeof N.cleanSession==="undefined"){N.cleanSession=true}if(N.hosts){if(!(N.hosts instanceof Array)){throw new Error(u(j.INVALID_ARGUMENT,[N.hosts,"connectOptions.hosts"]))}if(N.hosts.length<1){throw new Error(u(j.INVALID_ARGUMENT,[N.hosts,"connectOptions.hosts"]))}var P=false;for(var M=0;M<N.hosts.length;M++){if(typeof N.hosts[M]!=="string"){throw new Error(u(j.INVALID_TYPE,[typeof N.hosts[M],"connectOptions.hosts["+M+"]"]))}if(/^(wss?):\/\/((\[(.+)\])|([^\/]+?))(:(\d+))?(\/.*)$/.test(N.hosts[M])){if(M==0){P=true}else{if(!P){throw new Error(u(j.INVALID_ARGUMENT,[N.hosts[M],"connectOptions.hosts["+M+"]"]))}}}else{if(P){throw new Error(u(j.INVALID_ARGUMENT,[N.hosts[M],"connectOptions.hosts["+M+"]"]))}}}if(!P){if(!N.ports){throw new Error(u(j.INVALID_ARGUMENT,[N.ports,"connectOptions.ports"]))}if(!(N.ports instanceof Array)){throw new Error(u(j.INVALID_ARGUMENT,[N.ports,"connectOptions.ports"]))}if(N.hosts.length!=N.ports.length){throw new Error(u(j.INVALID_ARGUMENT,[N.ports,"connectOptions.ports"]))}N.uris=[];for(var M=0;M<N.hosts.length;M++){if(typeof N.ports[M]!=="number"||N.ports[M]<0){throw new Error(u(j.INVALID_TYPE,[typeof N.ports[M],"connectOptions.ports["+M+"]"]))}var O=N.hosts[M];var L=N.ports[M];var K=(O.indexOf(":")!=-1);B="ws://"+(K?"["+O+"]":O)+":"+L+J;N.uris.push(B)}}else{N.uris=N.hosts}}D.connect(N)};this.subscribe=function(L,K){if(typeof L!=="string"){throw new Error("Invalid argument:"+L)}K=K||{};m(K,{qos:"number",invocationContext:"object",onSuccess:"function",onFailure:"function",timeout:"number"});if(K.timeout&&!K.onFailure){throw new Error("subscribeOptions.timeout specified with no onFailure callback.")}if(typeof K.qos!=="undefined"&&!(K.qos===0||K.qos===1||K.qos===2)){throw new Error(u(j.INVALID_ARGUMENT,[K.qos,"subscribeOptions.qos"]))}D.subscribe(L,K)};this.unsubscribe=function(L,K){if(typeof L!=="string"){throw new Error("Invalid argument:"+L)}K=K||{};m(K,{invocationContext:"object",onSuccess:"function",onFailure:"function",timeout:"number"});if(K.timeout&&!K.onFailure){throw new Error("unsubscribeOptions.timeout specified with no onFailure callback.")}D.unsubscribe(L,K)};this.send=function(L,O,N,K){var M;if(arguments.length==0){throw new Error("Invalid argument.length")}else{if(arguments.length==1){if(!(L instanceof a)&&(typeof L!=="string")){throw new Error("Invalid argument:"+typeof L)}M=L;if(typeof M.destinationName==="undefined"){throw new Error(u(j.INVALID_ARGUMENT,[M.destinationName,"Message.destinationName"]))}D.send(M)}else{M=new a(O);M.destinationName=L;if(arguments.length>=3){M.qos=N}if(arguments.length>=4){M.retained=K}D.send(M)}}};this.disconnect=function(){D.disconnect()};this.getTraceLog=function(){return D.getTraceLog()};this.startTrace=function(){D.startTrace()};this.stopTrace=function(){D.stopTrace()};this.isConnected=function(){return D.connected}};p.prototype={get hostfunction(){return this._getHost()},set hostfunction(z){this._setHost(z)},get portfunction(){return this._getPort()},set portfunction(z){this._setPort(z)},get pathfunction(){return this._getPath()},set pathfunction(z){this._setPath(z)},get clientIdfunction(){return this._getClientId()},set clientIdfunction(z){this._setClientId(z)},get onConnectionLostfunction(){return this._getOnConnectionLost()},set onConnectionLostfunction(z){this._setOnConnectionLost(z)},get onMessageDeliveredfunction(){return this._getOnMessageDelivered()},set onMessageDeliveredfunction(z){this._setOnMessageDelivered(z)},get onMessageArrivedfunction(){return this._getOnMessageArrived()},set onMessageArrivedfunction(z){this._setOnMessageArrived(z)},get tracefunction(){return this._getTrace()},set tracefunction(z){this._setTrace(z)}};var a=function(A){var D;if(typeof A==="string"||A instanceof ArrayBuffer||A instanceof Int8Array||A instanceof Uint8Array||A instanceof Int16Array||A instanceof Uint16Array||A instanceof Int32Array||A instanceof Uint32Array||A instanceof Float32Array||A instanceof Float64Array){D=A}else{throw (u(j.INVALID_ARGUMENT,[A,"newPayload"]))}this._getPayloadString=function(){if(typeof D==="string"){return D}else{return n(D,0,D.length)}};this._getPayloadBytes=function(){if(typeof D==="string"){var F=new ArrayBuffer(c(D));var G=new Uint8Array(F);i(D,G,0);return G}else{return D}};var E=undefined;this._getDestinationName=function(){return E};this._setDestinationName=function(F){if(typeof F==="string"){E=F}else{throw new Error(u(j.INVALID_ARGUMENT,[F,"newDestinationName"]))}};var B=0;this._getQos=function(){return B};this._setQos=function(F){if(F===0||F===1||F===2){B=F}else{throw new Error("Invalid argument:"+F)}};var z=false;this._getRetained=function(){return z};this._setRetained=function(F){if(typeof F==="boolean"){z=F}else{throw new Error(u(j.INVALID_ARGUMENT,[F,"newRetained"]))}};var C=false;this._getDuplicate=function(){return C};this._setDuplicate=function(F){C=F}};a.prototype={get payloadStringfunction(){return this._getPayloadString()},get payloadBytesfunction(){return this._getPayloadBytes()},get destinationNamefunction(){return this._getDestinationName()},set destinationNamefunction(z){this._setDestinationName(z)},get qosfunction(){return this._getQos()},set qosfunction(z){this._setQos(z)},get retainedfunction(){return this._getRetained()},set retainedfunction(z){this._setRetained(z)},get duplicatefunction(){return this._getDuplicate()},set duplicatefunction(z){this._setDuplicate(z)}};return{Client:p,Message:a}})(window);module.exports=Paho.MQTT;
},{}],4:[function(require,module,exports){
/*jshint bitwise:false*/
/*global unescape*/

(function (factory) {
    if (typeof exports === 'object') {
        // Node/CommonJS
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(factory);
    } else {
        // Browser globals (with support for web workers)
        var glob;
        try {
            glob = window;
        } catch (e) {
            glob = self;
        }

        glob.SparkMD5 = factory();
    }
}(function (undefined) {

    'use strict';

    ////////////////////////////////////////////////////////////////////////////

    /*
     * Fastest md5 implementation around (JKM md5)
     * Credits: Joseph Myers
     *
     * @see http://www.myersdaily.org/joseph/javascript/md5-text.html
     * @see http://jsperf.com/md5-shootout/7
     */

    /* this function is much faster,
      so if possible we use it. Some IEs
      are the only ones I know of that
      need the idiotic second function,
      generated by an if clause.  */
    var add32 = function (a, b) {
        return (a + b) & 0xFFFFFFFF;
    },

    cmn = function (q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
    },

    ff = function (a, b, c, d, x, s, t) {
        return cmn((b & c) | ((~b) & d), a, b, x, s, t);
    },

    gg = function (a, b, c, d, x, s, t) {
        return cmn((b & d) | (c & (~d)), a, b, x, s, t);
    },

    hh = function (a, b, c, d, x, s, t) {
        return cmn(b ^ c ^ d, a, b, x, s, t);
    },

    ii = function (a, b, c, d, x, s, t) {
        return cmn(c ^ (b | (~d)), a, b, x, s, t);
    },

    md5cycle = function (x, k) {
        var a = x[0],
            b = x[1],
            c = x[2],
            d = x[3];

        a = ff(a, b, c, d, k[0], 7, -680876936);
        d = ff(d, a, b, c, k[1], 12, -389564586);
        c = ff(c, d, a, b, k[2], 17, 606105819);
        b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897);
        d = ff(d, a, b, c, k[5], 12, 1200080426);
        c = ff(c, d, a, b, k[6], 17, -1473231341);
        b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7, 1770035416);
        d = ff(d, a, b, c, k[9], 12, -1958414417);
        c = ff(c, d, a, b, k[10], 17, -42063);
        b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7, 1804603682);
        d = ff(d, a, b, c, k[13], 12, -40341101);
        c = ff(c, d, a, b, k[14], 17, -1502002290);
        b = ff(b, c, d, a, k[15], 22, 1236535329);

        a = gg(a, b, c, d, k[1], 5, -165796510);
        d = gg(d, a, b, c, k[6], 9, -1069501632);
        c = gg(c, d, a, b, k[11], 14, 643717713);
        b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691);
        d = gg(d, a, b, c, k[10], 9, 38016083);
        c = gg(c, d, a, b, k[15], 14, -660478335);
        b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5, 568446438);
        d = gg(d, a, b, c, k[14], 9, -1019803690);
        c = gg(c, d, a, b, k[3], 14, -187363961);
        b = gg(b, c, d, a, k[8], 20, 1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467);
        d = gg(d, a, b, c, k[2], 9, -51403784);
        c = gg(c, d, a, b, k[7], 14, 1735328473);
        b = gg(b, c, d, a, k[12], 20, -1926607734);

        a = hh(a, b, c, d, k[5], 4, -378558);
        d = hh(d, a, b, c, k[8], 11, -2022574463);
        c = hh(c, d, a, b, k[11], 16, 1839030562);
        b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060);
        d = hh(d, a, b, c, k[4], 11, 1272893353);
        c = hh(c, d, a, b, k[7], 16, -155497632);
        b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4, 681279174);
        d = hh(d, a, b, c, k[0], 11, -358537222);
        c = hh(c, d, a, b, k[3], 16, -722521979);
        b = hh(b, c, d, a, k[6], 23, 76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487);
        d = hh(d, a, b, c, k[12], 11, -421815835);
        c = hh(c, d, a, b, k[15], 16, 530742520);
        b = hh(b, c, d, a, k[2], 23, -995338651);

        a = ii(a, b, c, d, k[0], 6, -198630844);
        d = ii(d, a, b, c, k[7], 10, 1126891415);
        c = ii(c, d, a, b, k[14], 15, -1416354905);
        b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6, 1700485571);
        d = ii(d, a, b, c, k[3], 10, -1894986606);
        c = ii(c, d, a, b, k[10], 15, -1051523);
        b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6, 1873313359);
        d = ii(d, a, b, c, k[15], 10, -30611744);
        c = ii(c, d, a, b, k[6], 15, -1560198380);
        b = ii(b, c, d, a, k[13], 21, 1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070);
        d = ii(d, a, b, c, k[11], 10, -1120210379);
        c = ii(c, d, a, b, k[2], 15, 718787259);
        b = ii(b, c, d, a, k[9], 21, -343485551);

        x[0] = add32(a, x[0]);
        x[1] = add32(b, x[1]);
        x[2] = add32(c, x[2]);
        x[3] = add32(d, x[3]);
    },

    /* there needs to be support for Unicode here,
       * unless we pretend that we can redefine the MD-5
       * algorithm for multi-byte characters (perhaps
       * by adding every four 16-bit characters and
       * shortening the sum to 32 bits). Otherwise
       * I suggest performing MD-5 as if every character
       * was two bytes--e.g., 0040 0025 = @%--but then
       * how will an ordinary MD-5 sum be matched?
       * There is no way to standardize text to something
       * like UTF-8 before transformation; speed cost is
       * utterly prohibitive. The JavaScript standard
       * itself needs to look at this: it should start
       * providing access to strings as preformed UTF-8
       * 8-bit unsigned value arrays.
       */
    md5blk = function (s) {
        var md5blks = [],
            i; /* Andy King said do it this way. */

        for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
    },

    md5blk_array = function (a) {
        var md5blks = [],
            i; /* Andy King said do it this way. */

        for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
        }
        return md5blks;
    },

    md51 = function (s) {
        var n = s.length,
            state = [1732584193, -271733879, -1732584194, 271733878],
            i,
            length,
            tail,
            tmp,
            lo,
            hi;

        for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        length = s.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
        }
        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Beware that the final length might not fit in 32 bits so we take care of that
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;

        md5cycle(state, tail);
        return state;
    },

    md51_array = function (a) {
        var n = a.length,
            state = [1732584193, -271733879, -1732584194, 271733878],
            i,
            length,
            tail,
            tmp,
            lo,
            hi;

        for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
        }

        // Not sure if it is a bug, however IE10 will always produce a sub array of length 1
        // containing the last element of the parent array if the sub array specified starts
        // beyond the length of the parent array - weird.
        // https://connect.microsoft.com/IE/feedback/details/771452/typed-array-subarray-issue
        a = (i - 64) < n ? a.subarray(i - 64) : new Uint8Array(0);

        length = a.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= a[i] << ((i % 4) << 3);
        }

        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Beware that the final length might not fit in 32 bits so we take care of that
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;

        md5cycle(state, tail);

        return state;
    },

    hex_chr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'],

    rhex = function (n) {
        var s = '',
            j;
        for (j = 0; j < 4; j += 1) {
            s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
        }
        return s;
    },

    hex = function (x) {
        var i;
        for (i = 0; i < x.length; i += 1) {
            x[i] = rhex(x[i]);
        }
        return x.join('');
    },

    md5 = function (s) {
        return hex(md51(s));
    },



    ////////////////////////////////////////////////////////////////////////////

    /**
     * SparkMD5 OOP implementation.
     *
     * Use this class to perform an incremental md5, otherwise use the
     * static methods instead.
     */
    SparkMD5 = function () {
        // call reset to init the instance
        this.reset();
    };


    // In some cases the fast add32 function cannot be used..
    if (md5('hello') !== '5d41402abc4b2a76b9719d911017c592') {
        add32 = function (x, y) {
            var lsw = (x & 0xFFFF) + (y & 0xFFFF),
                msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        };
    }


    /**
     * Appends a string.
     * A conversion will be applied if an utf8 string is detected.
     *
     * @param {String} str The string to be appended
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.append = function (str) {
        // converts the string to utf8 bytes if necessary
        if (/[\u0080-\uFFFF]/.test(str)) {
            str = unescape(encodeURIComponent(str));
        }

        // then append as binary
        this.appendBinary(str);

        return this;
    };

    /**
     * Appends a binary string.
     *
     * @param {String} contents The binary string to be appended
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.appendBinary = function (contents) {
        this._buff += contents;
        this._length += contents.length;

        var length = this._buff.length,
            i;

        for (i = 64; i <= length; i += 64) {
            md5cycle(this._state, md5blk(this._buff.substring(i - 64, i)));
        }

        this._buff = this._buff.substr(i - 64);

        return this;
    };

    /**
     * Finishes the incremental computation, reseting the internal state and
     * returning the result.
     * Use the raw parameter to obtain the raw result instead of the hex one.
     *
     * @param {Boolean} raw True to get the raw result, false to get the hex result
     *
     * @return {String|Array} The result
     */
    SparkMD5.prototype.end = function (raw) {
        var buff = this._buff,
            length = buff.length,
            i,
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ret;

        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= buff.charCodeAt(i) << ((i % 4) << 3);
        }

        this._finish(tail, length);
        ret = !!raw ? this._state : hex(this._state);

        this.reset();

        return ret;
    };

    /**
     * Finish the final calculation based on the tail.
     *
     * @param {Array}  tail   The tail (will be modified)
     * @param {Number} length The length of the remaining buffer
     */
    SparkMD5.prototype._finish = function (tail, length) {
        var i = length,
            tmp,
            lo,
            hi;

        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(this._state, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Do the final computation based on the tail and length
        // Beware that the final length may not fit in 32 bits so we take care of that
        tmp = this._length * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;
        md5cycle(this._state, tail);
    };

    /**
     * Resets the internal state of the computation.
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.reset = function () {
        this._buff = "";
        this._length = 0;
        this._state = [1732584193, -271733879, -1732584194, 271733878];

        return this;
    };

    /**
     * Releases memory used by the incremental buffer and other aditional
     * resources. If you plan to use the instance again, use reset instead.
     */
    SparkMD5.prototype.destroy = function () {
        delete this._state;
        delete this._buff;
        delete this._length;
    };


    /**
     * Performs the md5 hash on a string.
     * A conversion will be applied if utf8 string is detected.
     *
     * @param {String}  str The string
     * @param {Boolean} raw True to get the raw result, false to get the hex result
     *
     * @return {String|Array} The result
     */
    SparkMD5.hash = function (str, raw) {
        // converts the string to utf8 bytes if necessary
        if (/[\u0080-\uFFFF]/.test(str)) {
            str = unescape(encodeURIComponent(str));
        }

        var hash = md51(str);

        return !!raw ? hash : hex(hash);
    };

    /**
     * Performs the md5 hash on a binary string.
     *
     * @param {String}  content The binary string
     * @param {Boolean} raw     True to get the raw result, false to get the hex result
     *
     * @return {String|Array} The result
     */
    SparkMD5.hashBinary = function (content, raw) {
        var hash = md51(content);

        return !!raw ? hash : hex(hash);
    };

    /**
     * SparkMD5 OOP implementation for array buffers.
     *
     * Use this class to perform an incremental md5 ONLY for array buffers.
     */
    SparkMD5.ArrayBuffer = function () {
        // call reset to init the instance
        this.reset();
    };

    ////////////////////////////////////////////////////////////////////////////

    /**
     * Appends an array buffer.
     *
     * @param {ArrayBuffer} arr The array to be appended
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.append = function (arr) {
        // TODO: we could avoid the concatenation here but the algorithm would be more complex
        //       if you find yourself needing extra performance, please make a PR.
        var buff = this._concatArrayBuffer(this._buff, arr),
            length = buff.length,
            i;

        this._length += arr.byteLength;

        for (i = 64; i <= length; i += 64) {
            md5cycle(this._state, md5blk_array(buff.subarray(i - 64, i)));
        }

        // Avoids IE10 weirdness (documented above)
        this._buff = (i - 64) < length ? buff.subarray(i - 64) : new Uint8Array(0);

        return this;
    };

    /**
     * Finishes the incremental computation, reseting the internal state and
     * returning the result.
     * Use the raw parameter to obtain the raw result instead of the hex one.
     *
     * @param {Boolean} raw True to get the raw result, false to get the hex result
     *
     * @return {String|Array} The result
     */
    SparkMD5.ArrayBuffer.prototype.end = function (raw) {
        var buff = this._buff,
            length = buff.length,
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            i,
            ret;

        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= buff[i] << ((i % 4) << 3);
        }

        this._finish(tail, length);
        ret = !!raw ? this._state : hex(this._state);

        this.reset();

        return ret;
    };

    SparkMD5.ArrayBuffer.prototype._finish = SparkMD5.prototype._finish;

    /**
     * Resets the internal state of the computation.
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.reset = function () {
        this._buff = new Uint8Array(0);
        this._length = 0;
        this._state = [1732584193, -271733879, -1732584194, 271733878];

        return this;
    };

    /**
     * Releases memory used by the incremental buffer and other aditional
     * resources. If you plan to use the instance again, use reset instead.
     */
    SparkMD5.ArrayBuffer.prototype.destroy = SparkMD5.prototype.destroy;

    /**
     * Concats two array buffers, returning a new one.
     *
     * @param  {ArrayBuffer} first  The first array buffer
     * @param  {ArrayBuffer} second The second array buffer
     *
     * @return {ArrayBuffer} The new array buffer
     */
    SparkMD5.ArrayBuffer.prototype._concatArrayBuffer = function (first, second) {
        var firstLength = first.length,
            result = new Uint8Array(firstLength + second.byteLength);

        result.set(first);
        result.set(new Uint8Array(second), firstLength);

        return result;
    };

    /**
     * Performs the md5 hash on an array buffer.
     *
     * @param {ArrayBuffer} arr The array buffer
     * @param {Boolean}     raw True to get the raw result, false to get the hex result
     *
     * @return {String|Array} The result
     */
    SparkMD5.ArrayBuffer.hash = function (arr, raw) {
        var hash = md51_array(new Uint8Array(arr));

        return !!raw ? hash : hex(hash);
    };

    return SparkMD5;
}));

},{}],5:[function(require,module,exports){
/**
 * Application-level APIs for nutella, browser version
 */

// Require various sub-modules
var AppNetSubModule = require('./app_net');
var AppLogSubModule = require('./app_log');


var AppSubModule = function(main_nutella) {
    // Initialized the various sub-modules
    this.net = new AppNetSubModule(main_nutella);
    this.log = new AppLogSubModule(main_nutella);
};


module.exports = AppSubModule;
},{"./app_log":6,"./app_net":7}],6:[function(require,module,exports){
/**
 * App-level log APIs for nutella
 */

var AppNetSubModule = require('./app_net');

var AppLogSubModule = function(main_nutella) {
    this.net = new AppNetSubModule(main_nutella);
};



AppLogSubModule.prototype.debug = function(message, code) {
    console.debug(message);
    this.net.publish('logging', logToJson(message, code, 'debug'));
    return code;
};

AppLogSubModule.prototype.info = function(message, code) {
    console.info(message);
    this.net.publish('logging', logToJson(message, code, 'info'));
    return code;
};

AppLogSubModule.prototype.success = function(message, code) {
    console.log('%c '+ message , 'color: #009933');
    this.net.publish('logging', logToJson(message, code, 'success'));
    return code;
};

AppLogSubModule.prototype.warn = function(message, code) {
    console.warn(message);
    this.net.publish('logging', logToJson(message, code, 'warn'));
    return code;
};

AppLogSubModule.prototype.error = function(message, code) {
    console.error(message);
    this.net.publish('logging', logToJson(message, code, 'error'));
    return code;
};


function logToJson( message, code, level) {
    return (code === undefined) ? {level: level, message: message} : {level: level, message: message, code: code};
}



module.exports = AppLogSubModule;

},{"./app_net":7}],7:[function(require,module,exports){
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

/**
 * Allows application-level APIs to subscribe to a run-level channel within a specific run
 *
 * @param run_id
 * @param channel
 * @param callback
 * @param done_callback
 */
AppNetSubModule.prototype.subscribe_to_run = function(run_id, channel, callback, done_callback) {
    this.net.subscribe_to(channel,callback,this.net.nutella.appId,run_id,done_callback);
};


/**
 * Allows application-level APIs to unsubscribe from a run-level channel within a specific run
 *
 * @param run_id
 * @param channel
 * @param done_callback
 */
AppNetSubModule.prototype.unsubscribe_from_run = function(run_id, channel, done_callback) {
    this.net.unsubscribe_from(channel,this.net.nutella.appId,run_id,done_callback);
};


/**
 * Allows application-level APIs to publish to a run-level channel within a specific run
 *
 * @param run_id
 * @param channel
 * @param message
 */
AppNetSubModule.prototype.publish_to_run = function( run_id, channel, message ) {
    this.net.publish_to(channel,message,this.net.nutella.appId, run_id);
};


/**
 * Allows application-level APIs to make a request to a run-level channel within a specific run
 *
 * @param run_id
 * @param channel
 * @param request
 * @param callback
 */
AppNetSubModule.prototype.request_to_run = function( run_id, channel, request, callback) {
    this.net.request_to(channel,request,callback,this.net.nutella.appId,run_id);
};


/**
 * Allows application-level APIs to handle requests on a run-level channel within a specific run
 *
 * @param run_id
 * @param channel
 * @param callback
 * @param done_callback
 */
AppNetSubModule.prototype.handle_requests_on_run = function( run_id, channel, callback, done_callback ) {
    this.net.handle_requests_on(channel,callback,this.net.nutella.appId,run_id,done_callback);
};


//----------------------------------------------------------------------------------------------------------------
// Application-level APIs to communicate at the run-level (broadcast)
//----------------------------------------------------------------------------------------------------------------

/**
 * Fired whenever a message is received on the specified channel for any of the runs in the application
 *
 * @callback all_runs_cb
 * @param {string} message - the received message. Messages that are not JSON are discarded.
 * @param {string} run_id - the run_id of the channel the message was sent on
 * @param {Object} from - the sender's identifiers (run_id, app_id, component_id and optionally resource_id)
 */

/**
 * Allows application-level APIs to subscribe to a run-level channel *for ALL runs*
 *
 * @param {string} channel - the run-level channel we are subscribing to. Can be wildcard
 * @param {all_runs_cb} callback - the callback that is fired whenever a message is received on the channel
 */
AppNetSubModule.prototype.subscribe_to_all_runs = function(channel, callback, done_callback) {
    var app_id = this.net.nutella.appId;
    //Pad channel
    var padded_channel = this.net.pad_channel(channel, app_id, '+');
    var mqtt_cb = function(mqtt_message, mqtt_channel) {
        try {
            var f = JSON.parse(mqtt_message);
            var run_id = extractRunId(app_id, mqtt_channel);
            if(f.type==='publish')
                callback(f.payload, run_id, f.from);
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
    this.net.subscriptions.push(padded_channel);
    this.net.callbacks.push(mqtt_cb);
    this.net.nutella.mqtt_client.subscribe(padded_channel, mqtt_cb, done_callback);
    // Notify subscription
    this.net.publish_to('subscriptions', {type: 'subscribe', channel:  padded_channel}, this.net.nutella.appId, undefined);
};


/**
 * Allows application-level APIs to publish a message to a run-level channel *for ALL runs*
 *
 * @param channel
 * @param message
 */
AppNetSubModule.prototype.publish_to_all_runs = function(channel, message) {
  this.net.nutella.runs_list.forEach(function(run_id){
      this.net.publish_to(channel,message,this.net.nutella.appId,run_id);
  }.bind(this));
};


/**
 * Allows application-level APIs to send a request to a run-level channel *for ALL runs*
 *
 * @param channel
 * @param request
 * @param callback
 */
AppNetSubModule.prototype.request_to_all_runs = function(channel, request, callback) {
    this.net.nutella.runs_list.forEach(function(run_id){
        this.net.request_to(channel,request,callback,this.net.nutella.appId,run_id);
    }.bind(this));
};


/**
 * This callback is used to handle all runs
 * @callback handle_all_run
 * @param {string} message - the received message. Messages that are not JSON are discarded.
 * @param {string} run_id - the run_id of the channel the message was sent on
 * @param {Object} from - the sender's identifiers (run_id, app_id, component_id and optionally resource_id)
 * @return {Object} the response sent back to the client that performed the request. Whatever is returned by the callback is marshaled into a JSON string and sent via MQTT.
 */

/**
 * Allows application-level APIs to handle requests to a run-level channel *for ALL runs*
 *
 * @param channel
 * @param callback
 * @param done_callback
 */
AppNetSubModule.prototype.handle_requests_on_all_runs = function(channel, callback, done_callback) {
    var app_id = this.net.nutella.appId;
    // Pad channel
    var padded_channel = this.net.pad_channel(channel, app_id, '+');
    var ln = this.net;
    var mqtt_cb = function(mqtt_message, mqtt_channel) {
        try {
            var f = JSON.parse(mqtt_message);
            var run_id = extractRunId(app_id, mqtt_channel);
            // Only handle requests that have proper id set
            if(f.type!=='request' || f.id===undefined) return;
            // Execute callback and send response
            var m = ln.prepare_message_for_response(callback(f.payload, run_id, f.from), f.id);
            ln.nutella.mqtt_client.publish( padded_channel, m );
        } catch(e) {
            if (e instanceof SyntaxError) {
                // Message is not JSON, drop it
            } else {
                // Bubble up whatever exception is thrown
                throw e;
            }
        }
    };
    this.net.nutella.mqtt_client.subscribe( padded_channel, mqtt_cb, done_callback);
    // Notify subscription
    this.net.publish_to('subscriptions', {type: 'handle_requests', channel:  padded_channel}, this.net.nutella.appId, undefined);
};



// Utility function

function extractRunId(app_id, mqtt_channel) {
    var pc = '/nutella/apps/' + app_id + '/runs/';
    var sp =  mqtt_channel.replace(pc, '').split('/');
    return sp[0];
}


module.exports = AppNetSubModule;

},{"./util/net":16}],8:[function(require,module,exports){
/**
 * Framework-level APIs for nutella, browser version
 */

// Require various sub-modules
var FrNetSubModule = require('./fr_net');
var FrLogSubModule = require('./fr_log');


var FrSubModule = function(main_nutella) {
    // Initialized the various sub-modules
    this.net = new FrNetSubModule(main_nutella);
    this.log = new FrLogSubModule(main_nutella);
};


module.exports = FrSubModule;
},{"./fr_log":9,"./fr_net":10}],9:[function(require,module,exports){
/**
 * Framework-level log APIs for nutella
 */

var FrNetSubModule = require('./app_net');

var FrLogSubModule = function(main_nutella) {
    this.net = new FrNetSubModule(main_nutella);
};



FrLogSubModule.prototype.debug = function(message, code) {
    console.debug(message);
    this.net.publish('logging', logToJson(message, code, 'debug'));
    return code;
};

FrLogSubModule.prototype.info = function(message, code) {
    console.info(message);
    this.net.publish('logging', logToJson(message, code, 'info'));
    return code;
};

FrLogSubModule.prototype.success = function(message, code) {
    console.log('%c '+ message , 'color: #009933');
    this.net.publish('logging', logToJson(message, code, 'success'));
    return code;
};

FrLogSubModule.prototype.warn = function(message, code) {
    console.warn(message);
    this.net.publish('logging', logToJson(message, code, 'warn'));
    return code;
};

FrLogSubModule.prototype.error = function(message, code) {
    console.error(message);
    this.net.publish('logging', logToJson(message, code, 'error'));
    return code;
};


function logToJson( message, code, level) {
    return (code === undefined) ? {level: level, message: message} : {level: level, message: message, code: code};
}



module.exports = FrLogSubModule;

},{"./app_net":7}],10:[function(require,module,exports){
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
// Framework-level APIs to communicate at the run-level to a specific run
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
 * Callback for subscribing to all runs
 * @callback allRunsCb
 # @param {string} message - the received message. Messages that are not JSON are discarded
 # @param {String} app_id - the app_id of the channel the message was sent on
 # @param {String} run_id - the run_id of the channel the message was sent on
 # @param {Object} from - the sender's identifiers (run_id, app_id, component_id and optionally resource_id)
 */

/**
 * Allows framework-level APIs to subscribe to a run-level channel *for ALL runs*
 *
 * @param channel
 * @param {allRunsCb} callback
 * @param done_callback
 */
FRNetSubModule.prototype.subscribe_to_all_runs = function( channel, callback, done_callback ) {
    //Pad channel
    var padded_channel = this.net.pad_channel(channel, '+', '+');
    var mqtt_cb = function(mqtt_message, mqtt_channel) {
        try {
            var f = JSON.parse(mqtt_message);
            var f1 = extractRunIdAndAppId(mqtt_channel);
            if(f.type==='publish')
                callback(f.payload, f1.appId, f1.runId, f.from);
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
    this.net.subscriptions.push(padded_channel);
    this.net.callbacks.push(mqtt_cb);
    this.net.nutella.mqtt_client.subscribe(padded_channel, mqtt_cb, done_callback);
    // Notify subscription
    this.net.publish_to('subscriptions', {type: 'subscribe', channel:  padded_channel}, undefined, undefined);
};


/**
 * Allows framework-level APIs to unsubscribe from a run-level channel *for ALL runs*
 *
 * @param channel
 * @param done_callback
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
    Object.keys(this.net.nutella.runs_list).forEach(function(app_id) {
        this.net.nutella.runs_list[app_id].runs.forEach(function(run_id){
            this.net.publish_to(channel, message, app_id, run_id);
        }.bind(this));
    }.bind(this));
};


/**
 * Allows framework-level APIs to send a request to a run-level channel *for ALL runs*
 *
 * @param channel
 * @param request
 * @param callback
 */
FRNetSubModule.prototype.request_to_all_runs = function(channel, request, callback) {
    Object.keys(this.net.nutella.runs_list).forEach(function(app_id) {
        this.net.nutella.runs_list[app_id].runs.forEach(function(run_id){
            this.net.publish_to(channel, message, app_id, run_id);
            this.net.request_to(channel, request, callback, app_id, run_id);
        }.bind(this));
    }.bind(this));
};

/**
 * Callback that is used to handle messages from all runs
 * @callback handle_all_runs_cb
 * @param {string} payload - the received message (request). Messages that are not JSON are discarded
 * @param {string} app_id - the app_id of the channel the request was sent on
 * @param {string} run_id - the run_id of the channel the request was sent on
 * @param {Object} from - the sender's identifiers (from containing, run_id, app_id, component_id and optionally resource_id)
 * @return {Object} the response sent back to the client that performed the request. Whatever is returned by the callback is marshaled into a JSON string and sent via MQTT.
 */

/**
 * Allows framework-level APIs to handle requests to a run-level channel *for ALL runs*
 *
 * @param channel
 * @param {handle_all_runs_cb} callback
 * @param done_callback
 */
FRNetSubModule.prototype.handle_requests_on_all_runs = function(channel, callback, done_callback) {
    // Pad channel
    var padded_channel = this.net.pad_channel(channel, '+', '+');
    var ln = this.net;
    var mqtt_cb = function(mqtt_message, mqtt_channel) {
        try {
            var f = JSON.parse(mqtt_message);
            var f1 = extractRunIdAndAppId(mqtt_channel);
            // Only handle requests that have proper id set
            if(f.type!=='request' || f.id===undefined) return;
            // Execute callback and send response
            var m = ln.prepare_message_for_response(callback(f.payload, f1.appId, f1.runId, f.from), f.id);
            ln.nutella.mqtt_client.publish( padded_channel, m );
        } catch(e) {
            if (e instanceof SyntaxError) {
                // Message is not JSON, drop it
            } else {
                // Bubble up whatever exception is thrown
                throw e;
            }
        }
    };
    this.net.nutella.mqtt_client.subscribe( padded_channel, mqtt_cb, done_callback);
    // Notify subscription
    this.net.publish_to('subscriptions', {type: 'handle_requests', channel:  padded_channel}, undefined, undefined);
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

/**
 * Callback used to handle all messages received when subscribing to all applications
 * @callback subscribeToAllAppsCb
 * @param {string} message - the received message. Messages that are not JSON are discarded
 * @param {string} app_id - the app_id of the channel the message was sent on
 * @param {Object} from - the sender's identifiers (run_id, app_id, component_id and optionally resource_id)
 */

/**
 * Allows framework-level APIs to subscribe to an app-level channel *for ALL apps*
 *
 * @param channel
 * @param {subscribeToAllAppsCb} callback
 * @param done_callback
 */
FRNetSubModule.prototype.subscribe_to_all_apps = function(channel, callback, done_callback) {
    //Pad channel
    var padded_channel = this.net.pad_channel(channel, '+', undefined);
    var mqtt_cb = function(mqtt_message, mqtt_channel) {
        try {
            var f = JSON.parse(mqtt_message);
            var app_id = extractAppId(mqtt_channel);
            if(f.type==='publish')
                callback(f.payload, app_id, f.from);
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
    this.net.subscriptions.push(padded_channel);
    this.net.callbacks.push(mqtt_cb);
    this.net.nutella.mqtt_client.subscribe(padded_channel, mqtt_cb, done_callback);
    // Notify subscription
    this.net.publish_to('subscriptions', {type: 'subscribe', channel:  padded_channel}, undefined, undefined);
};


/**
 * Allows framework-level APIs to unsubscribe from an app-level channel *for ALL apps*
 *
 * @param channel
 * @param done_callback
 */
FRNetSubModule.prototype.unsubscribe_from_all_apps = function(channel, done_callback) {
    this.net.unsubscribe_from(channel, '+', undefined, done_callback);
};


/**
 * Allows framework-level APIs to publish a message to an app-level channel *for ALL apps*
 *
 * @param channel
 * @param message
 */
FRNetSubModule.prototype.publish_to_all_apps = function(channel, message) {
    Object.keys(this.net.nutella.runs_list).forEach(function(app_id) {
        this.net.publish_to(channel, message, app_id, undefined);
    }.bind(this));
};


/**
 * Allows framework-level APIs to send a request to an app-level channel *for ALL apps*
 *
 * @param channel
 * @param request
 * @param callback
 */
FRNetSubModule.prototype.request_to_all_apps = function(channel, request, callback) {
    Object.keys(this.net.nutella.runs_list).forEach(function(app_id) {
        this.net.request_to(channel, request, callback, app_id, undefined);
    }.bind(this));
};


/**
 * This callback is used to handle messages coming from all applications
 * @callback handleAllAppsCb
 * @param {string} request - the received message (request). Messages that are not JSON are discarded.
 * @param {string} app_id - the app_id of the channel the request was sent on
 * @param {Object} from - the sender's identifiers (from containing, run_id, app_id, component_id and optionally resource_id)
 * @return {Object} The response sent back to the client that performed the request. Whatever is returned by the callback is marshaled into a JSON string and sent via MQTT.
 */

/**
 * Allows framework-level APIs to handle requests to app-level channel *for ALL runs*
 *
 * @param channel
 * @param {handleAllAppsCb} callback
 * @param done_callback
 */
FRNetSubModule.prototype.handle_requests_on_all_apps = function(channel, callback, done_callback) {
    // Pad channel
    var padded_channel = this.net.pad_channel(channel, '+', undefined);
    var ln = this.net;
    var mqtt_cb = function(mqtt_message, mqtt_channel) {
        try {
            var f = JSON.parse(mqtt_message);
            var f1 = extractRunIdAndAppId(mqtt_channel);
            // Only handle requests that have proper id set
            if(f.type!=='request' || f.id===undefined) return;
            // Execute callback and send response
            var m = ln.prepare_message_for_response(callback(f.payload, f1.appId, f1.runId, f.from), f.id);
            ln.nutella.mqtt_client.publish( padded_channel, m );
        } catch(e) {
            if (e instanceof SyntaxError) {
                // Message is not JSON, drop it
            } else {
                // Bubble up whatever exception is thrown
                throw e;
            }
        }
    };
    this.net.nutella.mqtt_client.subscribe( padded_channel, mqtt_cb, done_callback);
    // Notify subscription
    this.net.publish_to('subscriptions', {type: 'handle_requests', channel:  padded_channel}, undefined, undefined);
};


// Utility functions


function extractRunIdAndAppId(mqtt_channel) {
    var sp =  mqtt_channel.replace('/nutella/apps/', '').split('/');
    return {appId: sp[0], runId: sp[2]};
}

function extractAppId(mqtt_channel) {
    var sp =  mqtt_channel.replace('/nutella/apps/', '').split('/');
    return sp[0];
}




module.exports = FRNetSubModule;

},{"./util/net":16}],11:[function(require,module,exports){
/**
 * Run-level and App-level Nutella instances for the browser
 */

var SimpleMQTTClient = require('simple-mqtt-client');

// Require various sub-modules
var AppSubModule = require('./app_core_browser');
var FrSubModule = require('./fr_core_browser');
var NetSubModule = require('./run_net');
var LogSubModule = require('./run_log');
var LocationSubModule = require('./run_location');


/**
 * Defines the RunNutellaInstance class.
 *
 * @param {String } app_id - the app_id this component belongs to
 * @param {string} run_id - the run_id this component is launched in
 * @param {string} broker_hostname - the hostname of the broker.
 * @param {string} component_id - the name of this component
 */
var RunNutellaInstance = function (broker_hostname, app_id, run_id, component_id) {
    //Initialize parameters
    this.mqtt_client = new SimpleMQTTClient(broker_hostname);
    this.appId = app_id;
    this.runId = run_id;
    this.componentId = component_id;
    // Initialized the various sub-modules
    this.net = new NetSubModule(this);
    this.log = new LogSubModule(this);
    this.location = new LocationSubModule(this);
    // Start pinging
    setInterval(function(){
        this.net.publish('pings', 'ping');
    }.bind(this),5000);
};

/**
 * Sets the resource id for this instance of nutella
 *
 * @param {string} resource_id - the resource_id associated to this instance of nutella
 */
RunNutellaInstance.prototype.setResourceId = function(resource_id){
    this.resourceId = resource_id;
};


/**
 * Defines the AppNutellaInstance class.
 *
 * @param {String } app_id - the app_id this component belongs to
 * @param {string} broker_hostname - the hostname of the broker.
 * @param {string} component_id - the name of this component
 */
var AppNutellaInstance = function (broker_hostname, app_id, component_id) {
    //Initialize parameters
    this.mqtt_client = new SimpleMQTTClient(broker_hostname);
    this.appId = app_id;
    this.componentId = component_id;
    // Initialized the various sub-modules
    this.app = new AppSubModule(this);
    //Initialize the runs list
    this.runs_list = [];
    // Fetch the runs list
    this.app.net.request('app_runs_list', undefined, function(response) {
        this.runs_list = response;
    }.bind(this));
    // Subscribe to runs list updates
    this.app.net.subscribe('app_runs_list', function(message, from) {
        this.runs_list = message;
    }.bind(this));
    // Start pinging
    setInterval(function(){
        this.app.net.publish('pings', 'ping');
    }.bind(this),5000);
};

/**
 * Sets the resource id for this instance of nutella
 *
 * @param {string} resource_id - the resource_id associated to this instance of nutella
 */
AppNutellaInstance.prototype.setResourceId = function(resource_id){
    this.resourceId = resource_id;
};


/**
 * Defines the FRNutellaInstance class.
 *
 * @param {string} broker_hostname - the hostname of the broker.
 * @param {string} component_id - the name of this component
 */
var FrNutellaInstance = function (broker_hostname, component_id) {
    //Initialize parameters
    this.mqtt_client = new SimpleMQTTClient(broker_hostname);
    this.componentId = component_id;
    // Initialize the various sub-modules
    this.f = new FrSubModule(this);
    //Initialize the runs list
    this.runs_list = {};
    // Fetch the runs list
    this.f.net.request('runs_list', undefined, function(response) {
        this.runs_list = response;
    }.bind(this));
    // Subscribe to runs list updates
    this.f.net.subscribe('runs_list', function(message, from) {
        this.runs_list = message;
    }.bind(this));
    // Start pinging
    setInterval(function(){
        this.f.net.publish('pings', 'ping');
    }.bind(this),5000);
};

/**
 * Sets the resource id for this instance of nutella
 *
 * @param {string} resource_id - the resource_id associated to this instance of nutella
 */
FrNutellaInstance.prototype.setResourceId = function(resource_id){
    this.resourceId = resource_id;
};



module.exports = {
    RunNutellaInstance : RunNutellaInstance,
    AppNutellaInstance : AppNutellaInstance,
    FrNutellaInstance : FrNutellaInstance
};
},{"./app_core_browser":5,"./fr_core_browser":8,"./run_location":12,"./run_log":13,"./run_net":14,"simple-mqtt-client":2}],12:[function(require,module,exports){
var LocationSubModule = function(main_nutella) {
    this.nutella = main_nutella;

    this._resources = {};
    this._initialized = false;

    var self = this;

    // Download all resources
    this.nutella.net.request("location/resources", {}, function(reply) {
        reply.resources.forEach(function(resource) {
            self._resources[resource.rid] = resource;
        });
        this._initialized = true;

        if(readyCallback != undefined) {
            readyCallback();
        }
    });

    // Update resources
    this.nutella.net.subscribe("location/resources/updated", function(message) {
        var resources = message.resources;
        resources.forEach(function(resource) {
            self._resources[resource.rid] = resource;
        });
    });

    // Add resources
    this.nutella.net.subscribe("location/resources/added", function(message) {
        var resources = message.resources;
        resources.forEach(function(resource) {
            self._resources[resource.rid] = resource;
        });
    });

    // Remove resources
    this.nutella.net.subscribe("location/resources/removed", function(message) {
        var resources = message.resources;
        resources.forEach(function(resource) {
            delete self._resources[resource.rid];
        });
    });
};

// Resource list for notify the update
updateResources = [];
enterResources = [];
exitResources = [];

// Enter and exit callbacks
enterCallback = undefined;
exitCallback = undefined;

// Ready callback
readyCallback = undefined;


Object.defineProperty(LocationSubModule.prototype, 'resources', {
    get: function() {
        var self = this;

        var resources = [];

        Object.keys(this._resources).forEach(function(key) {
            resources.push(self._resources[key]);
        });
        return resources;
    }
});

Object.defineProperty(LocationSubModule.prototype, 'resource', {
    get: function() {
        var self = this;

        var resource = {};

        // Create a virtual resource for every resource
        Object.keys(this._resources).forEach(function(key) {
            var r = self._resources[key];
            Object.defineProperty(resource, r.rid, {
                get: function() {
                    var virtualResource = generateVirtualResource(r);
                    return virtualResource;
                }
            });
        });
        return resource;
    }
});

function updateResource(resource) {
    var newResource = {};
    newResource.rid = resource.rid;
    if(resource.continuous != undefined) newResource.continuous = resource.continuous;
    if(resource.discrete != undefined) newResource.discrete = resource.discrete;

    newResource.parameters = [];

    for(p in resource.parameters) {
        newResource.parameters.push({key: p, value: resource.parameters[p]});
    }

    nutella.net.publish("location/resource/update", newResource);
}

function generateVirtualResource(resource) {
    var virtualResource = {};
    Object.defineProperty(virtualResource, 'rid', {
        get: function() {
            return resource.rid;
        }
    });
    virtualResource.continuous = {
        get x() { return resource.continuous.x; },
        set x(value) { resource.continuous.x = value; updateResource(resource); },

        get y() { return resource.continuous.y; },
        set y(value) { resource.continuous.y = value; updateResource(resource); }
    };
    virtualResource.discrete = {
        get x() { return resource.discrete.x; },
        set x(value) { resource.discrete.x = value; updateResource(resource); },

        get y() { return resource.discrete.y; },
        set y(value) { resource.discrete.y = value; updateResource(resource); }
    };
    virtualResource.proximity = {
        get rid() { return resource.proximity.rid; },
        get continuous() {
            return {x: resource.proximity.continuous.x, y: resource.proximity.continuous.y};
        },
        get discrete() {
            return {x: resource.proximity.discrete.x, y: resource.proximity.discrete.y};
        }
    };

    Object.defineProperty(virtualResource, 'notifyUpdate', {
        get: function () {
            return updateResources.indexOf(virtualResource.rid) != -1;
        },
        set: function (condition) {
            if(condition == true) {
                if (updateResources.indexOf(virtualResource.rid) == -1) {
                    updateResources.push(virtualResource.rid);
                }
            }
            else {
                if (updateResources.indexOf(virtualResource.rid) != -1) {
                    updateResources.remove(updateResources.indexOf(virtualResource.rid));
                }
            }
        }
    });


    Object.defineProperty(virtualResource, 'notifyEnter', {
        get: function () {
            return enterResources.indexOf(virtualResource.rid) != -1;
        },
        set: function (condition) {
            if(condition == true) {
                if (enterResources.indexOf(virtualResource.rid) == -1) {
                    enterResources.push(virtualResource.rid);
                    nutella.net.subscribe("location/resource/static/" + virtualResource.rid + "/enter", function(message) {
                        message.resources.forEach(function(dynamicResource) {
                            var staticVirtualResource = virtualResource;
                            var dynamicVirtualResource = generateVirtualResource(dynamicResource);
                            if(enterCallback != undefined) {
                                enterCallback(dynamicVirtualResource, staticVirtualResource);
                            }
                        });
                    });
                }
            }
            else {
                if (enterResources.indexOf(virtualResource.rid) != -1) {
                    enterResources.splice(enterResources.indexOf(virtualResource.rid), 1);
                    nutella.net.unsubscribe("location/resource/static/" + virtualResource.rid + "/enter");
                }
            }
        }
    });

    Object.defineProperty(virtualResource, 'notifyExit', {
        get: function () {
            return exitResources.indexOf(virtualResource.rid) != -1;
        },
        set: function (condition) {
            if(condition == true) {
                if (exitResources.indexOf(virtualResource.rid) == -1) {
                    exitResources.push(virtualResource.rid);
                    nutella.net.subscribe("location/resource/static/" + virtualResource.rid + "/exit", function(message) {
                        message.resources.forEach(function(dynamicResource) {
                            var staticVirtualResource = virtualResource;
                            var dynamicVirtualResource = generateVirtualResource(dynamicResource);
                            if(exitCallback != undefined) {
                                exitCallback(dynamicVirtualResource, staticVirtualResource);
                            }
                        });
                    });
                }
            }
            else {
                if (exitResources.indexOf(virtualResource.rid) != -1) {
                    exitResources.splice(exitResources.indexOf(virtualResource.rid), 1);
                    nutella.net.unsubscribe("location/resource/static/" + virtualResource.rid + "/exit");
                }
            }
        }
    });

    virtualResource.parameter = {};

    var parameters = [];
    for(p in resource.parameters) {
        parameters.push({value: resource.parameters[p], key: p});
    }
    parameters.forEach(function(p) {
        Object.defineProperty(virtualResource.parameter, p.key, {
            get: function() {
                return p.value;
            },
            set: function(value) {
                resource.parameters[p.key] = value;
                updateResource(resource);
            }
        });
    });

    return virtualResource;
}

LocationSubModule.prototype.resourceUpdated = function(callback) {
    nutella.net.subscribe("location/resources/updated", function(message) {
        message.resources.forEach(function(resource) {
            var virtualResource = generateVirtualResource(resource);
            if(updateResources.indexOf(resource.rid) != -1) {
                callback(virtualResource);
            }
        });
    });
};

// /location/resource/static/<rid>/enter
LocationSubModule.prototype.resourceEntered = function(callback) {
    enterCallback = callback;
};

LocationSubModule.prototype.resourceExited = function(callback) {
    exitCallback = callback;
};

LocationSubModule.prototype.ready = function(callback) {
    readyCallback = callback;
};

module.exports = LocationSubModule;

},{}],13:[function(require,module,exports){
/**
 * Run-level Logging APIs for nutella
 */

var NetSubModule = require('./run_net');

var LogSubModule = function(main_nutella) {
    this.net = new NetSubModule(main_nutella);
};


LogSubModule.prototype.debug = function(message, code) {
    console.debug(message);
    this.net.publish('logging', logToJson(message, code, 'debug'));
    return code;
};

LogSubModule.prototype.info = function(message, code) {
    console.info(message);
    this.net.publish('logging', logToJson(message, code, 'info'));
    return code;
};

LogSubModule.prototype.success = function(message, code) {
    console.log('%c '+ message , 'color: #009933');
    this.net.publish('logging', logToJson(message, code, 'success'));
    return code;
};

LogSubModule.prototype.warn = function(message, code) {
    console.warn(message);
    this.net.publish('logging', logToJson(message, code, 'warn'));
    return code;
};

LogSubModule.prototype.error = function(message, code) {
    console.error(message);
    this.net.publish('logging', logToJson(message, code, 'error'));
    return code;
};


function logToJson( message, code, level) {
    return (code===undefined) ? {level: level, message: message} : {level: level, message: message, code: code};
}





module.exports = LogSubModule;
},{"./run_net":14}],14:[function(require,module,exports){
/**
 * Run-level Network APIs for nutella
 */


var AbstractNet = require('./util/net');
var BinNet = require('./run_net_bin');


/**
 * Run-level network APIs for nutella
 * @param main_nutella
 * @constructor
 */
var NetSubModule = function(main_nutella) {
    // Store a reference to the main module
    this.nutella = main_nutella;
    this.net = new AbstractNet(main_nutella);
    // Binary net sub module
    this.bin = new BinNet(main_nutella, this);
};



/**
 * Subscribes to a channel or filter.
 *
 * @param channel
 * @param callback
 * @param done_callback
 */
NetSubModule.prototype.subscribe = function(channel, callback, done_callback) {
    this.net.subscribe_to(channel, callback, this.nutella.appId, this.nutella.runId, done_callback);
};



/**
 * Unsubscribes from a channel
 *
 * @param channel
 * @param done_callback
 */
NetSubModule.prototype.unsubscribe = function(channel, done_callback) {
    this.net.unsubscribe_from(channel, this.nutella.appId, this.nutella.runId, done_callback);
};



/**
 * Publishes a message to a channel
 *
 * @param channel
 * @param message
 */
NetSubModule.prototype.publish = function(channel, message) {
    this.net.publish_to(channel, message, this.nutella.appId, this.nutella.runId);
};



/**
 * Sends a request.
 *
 * @param channel
 * @param message
 * @param callback
 */
NetSubModule.prototype.request = function(channel, message, callback) {
    this.net.request_to(channel, message, callback, this.nutella.appId, this.nutella.runId);
};



/**
 * Handles requests.
 *
 * @param channel
 * @param callback
 * @param done_callback
 */
NetSubModule.prototype.handle_requests = function(channel, callback, done_callback) {
    this.net.handle_requests_on(channel, callback, this.nutella.appId, this.nutella.runId, done_callback);
};


module.exports = NetSubModule;

},{"./run_net_bin":15,"./util/net":16}],15:[function(require,module,exports){
/**
 * Run-level binary network APIs for nutella
 */


var SparkMD5 = require('spark-md5');


/**
 * Run-level binary network APIs for nutella
 * @param main_nutella
 * @constructor
 */
var BinNetSubModule = function(main_nutella, net_sub_module) {
    // Store a reference to the main module
    this.nutella = main_nutella;
    this.net = net_sub_module;
    this.file_mngr_url = 'http://' + main_nutella.mqtt_client.getHost() + ':57882';
};



/**
 * Uploads a file to the nutella file server
 * @param {File} file - the file we are uploading
 * @param cb - the callback fired whenever a file is correctly uploaded
 */
BinNetSubModule.prototype.uploadFile = function(file, cb) {
    var file_mngr_url = this.file_mngr_url;
    var reader = new FileReader();
    reader.onload = function(event) {
        // 2. calculate md5 hash
        var hexHash = SparkMD5.ArrayBuffer.hash(event.target.result );
        var extension = getFileExtension(file);
        var filename = hexHash + '.' + extension;
        // 3. check if the file is already stored and, if so, get the url
        isAlreadyUploaded(file_mngr_url, filename, function(fileURL) {
            // 4a. if it does, execute callback and pass the file url
            cb(fileURL);
        }, function() {
            // 4b. if it doesn't, upload
            upload(file_mngr_url, file, filename, function(fileURL) {
                // 5. execute callback and pass the file url
                cb(fileURL);
            });
        });
    };
    // 1. read file
    reader.readAsArrayBuffer(file);
};


//
// Helper function
// Extracts the extension from a file object
//
function getFileExtension(file) {
    return file.name.substring(file.name.lastIndexOf('.')+1, file.name.length).toLowerCase()
}


//
// Helper function
// This function checks if a particular filename already exists.
// If so it executes the first callback that is passed,
// otherwise the second one
//
function isAlreadyUploaded(file_mngr_url, filename, file_exists_cb, file_absent_cb) {
    var req = new XMLHttpRequest();
    req.open("GET", file_mngr_url + "/test/" + filename);
    req.onload = function(e) {
        var url = JSON.parse(req.response).url;
        if (url === undefined)
            file_absent_cb();
        else
            file_exists_cb(url);
    };
    req.send();
}


//
// Helper function
// This function uploads a file with a certain file name.
// If the upload is successful the first callback is executed,
// otherwise the second one is.
function upload(file_mngr_url, file, filename, success, error) {
    // Assemble data
    var fd = new FormData();
    fd.append("filename", filename);
    fd.append("file", file);
    var req = new XMLHttpRequest();
    req.open("POST", file_mngr_url + "/upload");
    req.onload = function(e) {
        var url = JSON.parse(req.response).url;
        if (url === undefined)
            error();
        else
            success(url);
    };
    req.send(fd);
}



/**
 * Subscribes to a channel for binary files uptes.
 *
 * @param channel this can only be a simple channel not
 * @param cb it takes two parameters, file and metadata
 * @param done_callback
 */
BinNetSubModule.prototype.subscribe = function(channel, cb, done_callback) {
    this.net.subscribe(channel, function(message, from) {
        // Discard non-bin message
        if (!message.bin) return;
        // Execute callback
        cb(message.url, message.metadata);
    }, done_callback);
};



/**
 * Unsubscribes from a channel
 *
 * @param channel
 * @param done_callback
 */
BinNetSubModule.prototype.unsubscribe = function(channel, done_callback) {
    this.net.unsubscribe(channel, done_callback);
};



/**
 * Publishes a binary file to a certain channel.
 *
 * @param channel
 * @param file 		File object https://developer.mozilla.org/en-US/docs/Web/API/File
 * @param done_callback
 */
BinNetSubModule.prototype.publish = function(channel, file, metadata, done_callback) {
    var net_mod = this.net;
    this.uploadFile(file, function(url) {
        net_mod.publish(channel, {bin: true, url: url, metadata: metadata});
        // Execute optional done callback
        if (done_callback!==undefined) done_callback();
    });
};









module.exports = BinNetSubModule;
},{"spark-md5":4}],16:[function(require,module,exports){
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
 * @param {string|undefined} appId - used to pad channels
 * @param {string|undefined} runId - used to pad channels
 * @param {function} done_callback - fired whenever the subscribe is successful
 */
AbstractNet.prototype.subscribe_to = function(channel, callback, appId, runId, done_callback) {
    // Pad channel
    var padded_channel = this.pad_channel(channel, appId, runId);
    // Maintain unique subscriptions
    if(this.subscriptions.indexOf(padded_channel)>-1)
        throw 'You can`t subscribe twice to the same channel`';
    // Depending on what type of channel we are subscribing to (wildcard or simple)
    // register a different kind of callback
    var mqtt_cb;
    if(this.nutella.mqtt_client.isChannelWildcard(padded_channel))
        mqtt_cb = function(mqtt_message, mqtt_channel) {
            try {
                var f = JSON.parse(mqtt_message);
                if(f.type==='publish')
                    callback(f.payload, this.un_pad_channel(mqtt_channel, appId, runId), f.from);
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
                var f = JSON.parse(mqtt_message);
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
    // Notify subscription
    this.publish_to('subscriptions', {type: 'subscribe', channel:  padded_channel}, appId, runId);
};


/**
 * Unsubscribes from a channel or a set of channels
 *
 * @param {string} channel - we want to unsubscribe from. Can contain wildcard(s)
 * @param {string|undefined} appId - used to pad channels
 * @param {string|undefined} runId - used to pad channels
 * @param {function} done_callback - fired whenever the subscribe is successful
 */
AbstractNet.prototype.unsubscribe_from = function(channel, appId, runId, done_callback ) {
    // Pad channel
    var padded_channel = this.pad_channel(channel, appId, runId);
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
 * @param {String|undefined} appId - used to pad the channels
 * @param {String|undefined} runId - used to pad the channels
 */
AbstractNet.prototype.publish_to = function(channel, message, appId, runId) {
    // Pad channel
    var padded_channel = this.pad_channel(channel, appId, runId);
    // Throw exception if trying to publish something that is not JSON
    try {
        var m = this.prepare_message_for_publish(message);
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
 * @param {string|undefined} appId - used to pad channels
 * @param {string|undefined} runId - used to pad channels
 */
AbstractNet.prototype.request_to = function( channel, message, callback, appId, runId ) {
    // Save nutella reference
    var nut = this.nutella;
    // Pad channel
    var padded_channel = this.pad_channel(channel, appId, runId);
    // Prepare message
    var m = this.prepare_message_for_request(message);
    //Prepare callback
    var mqtt_cb = function(mqtt_message) {
        var f = JSON.parse(mqtt_message);
        if (f.id===m.id && f.type==='response') {
            callback(f.payload);
            nut.mqtt_client.unsubscribe(padded_channel, mqtt_cb);
        }
    };
    // Subscribe
    this.nutella.mqtt_client.subscribe(padded_channel, mqtt_cb, function() {
        // Publish message
        nut.mqtt_client.publish( padded_channel, m.message );
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
 * @param {string|undefined} appId - used to pad channels
 * @param {string|undefined} runId - used to pad channels
 * @param {function} done_callback - fired whenever we are ready to handle requests
 */
AbstractNet.prototype.handle_requests_on = function( channel, callback, appId, runId, done_callback) {
    // Save nutella reference
    var nut = this.nutella;
    // Pad channel
    var padded_channel = this.pad_channel(channel, appId, runId);
    var mqtt_cb = function(request) {
        try {
            // Extract nutella fields
            var f = JSON.parse(request);
            // Only handle requests that have proper id set
            if(f.type!=='request' || f.id===undefined) return;
            // Execute callback and send response
            var m = this.prepare_message_for_response(callback(f.payload, f.from), f.id);
            nut.mqtt_client.publish( padded_channel, m );
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
    this.nutella.mqtt_client.subscribe(padded_channel, mqtt_cb, done_callback);
    // Notify subscription
    this.publish_to('subscriptions', {type: 'handle_requests', channel:  padded_channel}, appId, runId);
};



/**
 * Pads the channel with app_id and run_id
 *
 * @param channel
 * @param app_id
 * @param run_id
 * @return {string} the padded channel
 */
AbstractNet.prototype.pad_channel = function(channel, app_id, run_id) {
    if (run_id!==undefined && app_id===undefined)
        throw 'If the run_id is specified, app_id needs to also be specified';
    if (app_id===undefined && run_id===undefined)
        return '/nutella/' + channel;
    if (app_id!==undefined && run_id===undefined)
        return '/nutella/apps/' + app_id + '/' + channel;
    return '/nutella/apps/' + app_id + '/runs/' + run_id + '/' + channel;
};


/**
 * Un-pads the channel with app_id and run_id
 *
 * @param channel
 * @param app_id
 * @param run_id
 * @return {string} the un-padded channel
 */
AbstractNet.prototype.un_pad_channel = function(channel, app_id, run_id) {
    if (run_id!==undefined && app_id===undefined)
        throw 'If the run_id is specified, app_id needs to also be specified';
    if (app_id===undefined && run_id===undefined)
        return channel.replace('/nutella/', '');
    if (app_id!==undefined && run_id===undefined)
        return channel.replace("/nutella/apps/" + app_id + "/", '');
    return channel.replace("/nutella/apps/" + app_id + "/runs/" + run_id + "/", '');
};


/**
 * Assembles the unique ID of the component, starting from app_id, run_id, component_id and resource_id
 *
 * @return {Object} an object containing the unique ID of the component sending the message
 */
AbstractNet.prototype.assemble_from = function() {
    var from = {};
    // Set type, run_id and app_id whenever appropriate
    if(this.nutella.runId===undefined) {
        if(this.nutella.appId===undefined) {
            from.type = 'framework';
        } else {
            from.type = 'app';
            from.app_id = this.nutella.appId;
        }
    } else {
        from.type = 'run';
        from.app_id = this.nutella.appId;
        from.run_id = this.nutella.runId;
    }
    // Set the component_id
    from.component_id = this.nutella.componentId;
    // Set resource_id, if defined
    if (this.nutella.resourceId!==undefined)
        from.resource_id = this.nutella.resourceId;
    return from;
};


/**
 * Prepares a message for a publish
 *
 * @param {Object} message - the message content
 * @return {string} the serialized message, ready to be shipped over the net
 */
AbstractNet.prototype.prepare_message_for_publish = function (message) {
    if(message===undefined)
        return JSON.stringify({type: 'publish', from: this.assemble_from()});
    return JSON.stringify({type: 'publish', from: this.assemble_from(), payload: message});
};


/**
 * Prepares a message for a request
 *
 * @param {Object} message - the message content
 * @return {Object} the serialized response, ready to be shipped over the net and the id of the response
 */
AbstractNet.prototype.prepare_message_for_request = function (message) {
    var id = Math.floor((Math.random() * 100000) + 1).toString();
    var m = {};
    m.id = id;
    if(message===undefined)
        m.message = JSON.stringify({id: id, type: 'request', from: this.assemble_from()});
    else
        m.message = JSON.stringify({id: id, type: 'request', from: this.assemble_from(), payload: message});
    return m;
};


/**
 * Prepares a message for a response
 *
 * @param {Object} response - the response content
 * @param {string} id - the original request id
 * @return {string} the serialized message, ready to be shipped over the net
 */
AbstractNet.prototype.prepare_message_for_response = function (response, id) {
    if(response===undefined)
        return JSON.stringify({id: id, type: 'response', from: this.assemble_from()});
    return JSON.stringify({id: id, type: 'response', from: this.assemble_from(), payload: response});
};



// Export module
module.exports = AbstractNet;
},{}],17:[function(require,module,exports){
module.exports.version = '0.5.3';
},{}]},{},[1])(1)
});