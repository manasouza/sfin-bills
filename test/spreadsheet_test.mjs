import pkg_expect from 'expect.js'
const expect = pkg_expect
import m from 'moment'
import { convertToCurrency, isAtCurrentMonth } from '../spreadsheet.mjs'

describe('Spreadsheet Test', function() {
  describe('Expect currency values converted', function() {
    it('convert an integer value less than thousand', function() {
      // GIVEN
      const value = 51200
      const expected_value = '512,00'
      // WHEN
      let currency_value = convertToCurrency(value)
      // THEN
      expect(currency_value).to.be(expected_value)
    });
    it('convert a floating point value less than thousand', function() {
      // GIVEN
      const value = 7358
      const expected_value = '73,58'
      // WHEN
      let currency_value = convertToCurrency(value)
      // THEN
      expect(currency_value).to.be(expected_value)
    });
    it('convert an integer value greater than thousand', function() {
      // GIVEN
      const value = 151200
      const expected_value = '1512,00'
      // WHEN
      let currency_value = convertToCurrency(value)
      // THEN
      expect(currency_value).to.be(expected_value)
    });
  });
  describe('Expect expense months correctly identified', function() {
    it('should return true if sheet month column is equal to current month', function() {
      // GIVEN
      const current_month = 'Abril/2017'
      const sheet_column_month = 'Abril/2017'
      // WHEN
      const result = isAtCurrentMonth(current_month, sheet_column_month)
      // THEN
      expect(result).to.be(true)
    });
    it('should return false if sheet month column is greather than current month', function() {
      // GIVEN
      const current_month = 'Fevereiro/2017'
      const sheet_column_month = 'Março/2017'
      // WHEN
      const result = isAtCurrentMonth(current_month, sheet_column_month)
      // THEN
      expect(result).to.be(false)
    });
    it('should return false if sheet month column is lesser than current month', function() {
      // GIVEN
      const current_month = m().format('MMMM/YYYY')
      const sheet_column_month = 'Março/2017'
      // WHEN
      const result = isAtCurrentMonth(current_month, sheet_column_month)
      // THEN
      expect(result).to.be(false)
    });
  });
});
