if( typeof nutella === 'undefined' ) {
	var assert = require('chai').assert
  var nutella = require('../OLD/nutella_lib.js');
} else {
	var assert = chai.assert;
}

describe('Nutella', function(){
  describe('#test()', function(){
    it('should return "test" when called', function(){
      assert.equal("test", nutella.test());
    })
  })
})