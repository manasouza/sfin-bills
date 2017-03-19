var expect = require('expect.js');
var assert = require('assert');
var fileLoader = require('../file_loader')
describe('FileLoader', function() {
  describe('expect no files found', function() {
    it('nothing to do if no files found', function() {
      // GIVEN
      var file = {}
      file.length = 0
      // WHEN
      fileLoader.processFiles(file)
      // THEN
      assert.ok(true)
    });
  });
  describe('Get billing value from file name', function() {
    it('should get billing value from file name', function() {
      // GIVEN
      var file_title = 'Comprovante_Condomínio_56321.pdf'
      // WHEN
      billing_value = fileLoader.getBillingValue(file_title)
      // THEN
      expect(billing_value).to.be.ok()
      expect(billing_value).to.be('56321')
    });
  });
});
