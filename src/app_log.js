/**
 * App-level log APIs for nutella
 */



var AppLogSubModule = function(main_nutella) {
    // Store a reference to the main module
    this.main_nutella = main_nutella;
};



AppLogSubModule.prototype.test = function () {
    console.log("This is just a test method for the APP log sub-module");
};



module.exports = AppLogSubModule;
