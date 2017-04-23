var expect = require('expect.js')
var assert = require('assert')
var m = require('moment')
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
  });
  describe('Expect expense months correctly identified', function() {
    it('should return true if sheet month column is equal to current month', function() {
      // GIVEN
      var current_month = 'Abril/2017'
      var sheet_column_month = 'Abril/2017'
      // WHEN
      var result = spreadsheet.isAtCurrentMonth(current_month, sheet_column_month)
      // THEN
      expect(result).to.be(true)
    });
    it('should return false if sheet month column is greather than current month', function() {
      // GIVEN
      var current_month = 'Fevereiro/2017'
      var sheet_column_month = 'Março/2017'
      // WHEN
      var result = spreadsheet.isAtCurrentMonth(current_month, sheet_column_month)
      // THEN
      expect(result).to.be(false)
    });
    it('should return false if sheet month column is lesser than current month', function() {
      // GIVEN
      var current_month = m().format('MMMM/YYYY')
      var sheet_column_month = 'Março/2017'
      // WHEN
      var result = spreadsheet.isAtCurrentMonth(current_month, sheet_column_month)
      // THEN
      expect(result).to.be(false)
    });
  });
});
