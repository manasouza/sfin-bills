import pkg_expect from 'expect.js'
const expect = pkg_expect
import pkg_assert from 'assert'
const assert = pkg_assert
import { processFiles, getBillingValue, getReceiptName } from '../file_loader.mjs'

describe('FileLoader', function() {
  before(() => {
    process.env.database_cfg = "mapping_test";
  });
  describe('Expect no files found', function() {
    it('nothing to do if no files found', function() {
      // GIVEN
      var file = {}
      file.length = 0
      // WHEN
      processFiles(file)
      // THEN
      assert.ok(true)
    });
  });
  describe('Get billing value', function() {
    it('should get billing value from file name', function() {
      // GIVEN
      const billing_identifier = 'Comprovante'
      const expected_billing_value = '56321'
      const file_title = billing_identifier+'_Condomínio_'+expected_billing_value+'.pdf'
      // WHEN
      let billing_value = getBillingValue(file_title)
      // THEN
      expect(billing_value).to.be.ok()
      expect(billing_value).to.be(expected_billing_value)
    });
    it('should get billing value from file name with parcels', function() {
      // GIVEN
      const billing_identifier = 'Comprovante'
      const expected_billing_value = '56321'
      const file_title = billing_identifier+'_Condomínio_'+expected_billing_value+' (2).pdf'
      // WHEN
      let billing_value = getBillingValue(file_title)
      // THEN
      expect(billing_value).to.be.ok()
      expect(billing_value).to.be(expected_billing_value)
    });
    it('should get billing value from file name with extra receipt info and with parcels', function() {
      // GIVEN
      const billing_identifier = 'comprovante'
      const expected_billing_value = '3750'
      const file_title = billing_identifier+'_vivo_8113_'+expected_billing_value+' (1)'
      // WHEN
      let billing_value = getBillingValue(file_title)
      // THEN
      expect(billing_value).to.be.ok()
      expect(billing_value).to.be(expected_billing_value)
    });
  });
  describe('Get billing value', function() {
    it('should get receipt name from file name', function() {
      // GIVEN
      const billing_identifier = 'comprovante'
      const expected_receipt_name = 'condomínio'
      const file_title = billing_identifier+'_'+expected_receipt_name+'_50000'
      // WHEN
      let receipt_name = getReceiptName(file_title)
      // THEN
      expect(receipt_name).to.be.ok()
      expect(receipt_name).to.be(expected_receipt_name)
    });
    it('should get receipt name from file name with extra receipt info', function() {
      // GIVEN
      const billing_identifier = 'comprovante'
      const expected_receipt_name = 'vivo_8113'
      const file_title = billing_identifier+'_'+expected_receipt_name+'_7000'
      // WHEN
      let receipt_name = getReceiptName(file_title)
      // THEN
      expect(receipt_name).to.be.ok()
      expect(receipt_name).to.be(expected_receipt_name)
    });
  });
});
