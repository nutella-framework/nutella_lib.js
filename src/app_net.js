/**
 * App-level Networking APIs for nutella
 */



var AppNetSubModule = function(main_nutella) {
    // Store a reference to the main module
    this.main_nutella = main_nutella;
};



AppNetSubModule.prototype.test = function () {
    console.log("This is just a test method for the APP net sub-module");
};



module.exports = AppNetSubModule;
