var expect = require('expect.js');
var assert = require('assert');
var spreadsheet = require('../spreadsheet')
describe('Spreadsheet Test', function() {
  describe('Expect currency values converted', function() {
    it('convert an integer value less than thousand', function() {
      // GIVEN
      var value = 51200
      var expected_value = '512,00'
      // WHEN
      currency_value = spreadsheet.convertToCurrency(value)
      // THEN
      expect(currency_value).to.be(expected_value)
    });
    it('convert a floating point value less than thousand', function() {
      // GIVEN
      var value = 7358
      var expected_value = '73,58'
      // WHEN
      currency_value = spreadsheet.convertToCurrency(value)
      // THEN
      expect(currency_value).to.be(expected_value)
    });
    it('convert an integer value greater than thousand', function() {
      // GIVEN
      var value = 151200
      var expected_value = '1.512,00'
      // WHEN
      currency_value = spreadsheet.convertToCurrency(value)
      // THEN
      expect(currency_value).to.be(expected_value)
    });
  })
})
