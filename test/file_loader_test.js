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
  describe('Get billing value', function() {
    it('should get billing value from file name', function() {
      // GIVEN
      var expected_billing_identifier = 'Comprovante'
      var expected_billing_value = '56321'
      var file_title = expected_billing_identifier+'_Condomínio_'+expected_billing_value+'.pdf'
      // WHEN
      billing_value = fileLoader.getBillingValue(file_title)
      // THEN
      expect(billing_value).to.be.ok()
      expect(billing_value).to.be(expected_billing_value)
    });
    it('should get billing value from file name with parcels', function() {
      // GIVEN
      var expected_billing_identifier = 'Comprovante'
      var expected_billing_value = '56321'
      var file_title = expected_billing_identifier+'_Condomínio_'+expected_billing_value+' (2).pdf'
      // WHEN
      billing_value = fileLoader.getBillingValue(file_title)
      // THEN
      expect(billing_value).to.be.ok()
      expect(billing_value).to.be(expected_billing_value)
    });
    it('should get billing value from file name with extra receipt info and with parcels', function() {
      // GIVEN
      var expected_billing_identifier = 'comprovante'
      var expected_billing_value = '3750'
      var file_title = expected_billing_identifier+'_vivo_8113_'+expected_billing_value+' (1)'
      // WHEN
      billing_value = fileLoader.getBillingValue(file_title)
      // THEN
      expect(billing_value).to.be.ok()
      expect(billing_value).to.be(expected_billing_value)
    });
  });
});
