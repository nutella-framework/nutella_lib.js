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
  nutella.VERSION = '0.1.0';
 
 
  // Test function
	nutella.test = function(param) {
		return "test"
	};
 
  
  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules.
  if (typeof define === 'function' && define.amd) {
    define('nutella_lib', [], function() {
      return nutella;
    });
  }
}.call(this));