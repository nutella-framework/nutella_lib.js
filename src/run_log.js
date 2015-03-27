/**
 * Run-level Logging APIs for nutella
 */

var LogSubModule = function(main_nutella) {
    // Store a reference to the main module
    this.main_nutella = main_nutella;
};


LogSubModule.prototype.test = function () {
    console.log("This is just a test method for the app sub-module");
};




module.exports = LogSubModule;