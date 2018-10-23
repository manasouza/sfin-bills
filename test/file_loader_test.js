process.env.spreadsheet = 'test'

var expect = require('expect.js');
var assert = require('assert');
var fileLoader = require('../file_loader')

describe('FileLoader', function() {
  describe('Expect no files found', function() {
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
      var billing_identifier = 'Comprovante'
      var expected_billing_value = '56321'
      var file_title = billing_identifier+'_Condomínio_'+expected_billing_value+'.pdf'
      // WHEN
      billing_value = fileLoader.getBillingValue(file_title)
      // THEN
      expect(billing_value).to.be.ok()
      expect(billing_value).to.be(expected_billing_value)
    });
    it('should get billing value from file name with parcels', function() {
      // GIVEN
      var billing_identifier = 'Comprovante'
      var expected_billing_value = '56321'
      var file_title = billing_identifier+'_Condomínio_'+expected_billing_value+' (2).pdf'
      // WHEN
      billing_value = fileLoader.getBillingValue(file_title)
      // THEN
      expect(billing_value).to.be.ok()
      expect(billing_value).to.be(expected_billing_value)
    });
    it('should get billing value from file name with extra receipt info and with parcels', function() {
      // GIVEN
      var billing_identifier = 'comprovante'
      var expected_billing_value = '3750'
      var file_title = billing_identifier+'_vivo_8113_'+expected_billing_value+' (1)'
      // WHEN
      billing_value = fileLoader.getBillingValue(file_title)
      // THEN
      expect(billing_value).to.be.ok()
      expect(billing_value).to.be(expected_billing_value)
    });
  });
  describe('Get billing value', function() {
    it('should get receipt name from file name', function() {
      // GIVEN
      var billing_identifier = 'comprovante'
      var expected_receipt_name = 'condomínio'
      var file_title = billing_identifier+'_'+expected_receipt_name+'_50000'
      // WHEN
      receipt_name = fileLoader.getReceiptName(file_title)
      // THEN
      expect(receipt_name).to.be.ok()
      expect(receipt_name).to.be(expected_receipt_name)
    });
    it('should get receipt name from file name with extra receipt info', function() {
      // GIVEN
      var billing_identifier = 'comprovante'
      var expected_receipt_name = 'vivo_8113'
      var file_title = billing_identifier+'_'+expected_receipt_name+'_7000'
      // WHEN
      receipt_name = fileLoader.getReceiptName(file_title)
      // THEN
      expect(receipt_name).to.be.ok()
      expect(receipt_name).to.be(expected_receipt_name)
    });
  });
});
