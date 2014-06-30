var should = require('should');
var stasis = require('../lib/main');

describe('stasis', function () {
  describe('with no arguments', function () {
    it('returns hello world.', function () {
      var result = stasis();
      result.should.eql("Hello World!");
    });
  });
});