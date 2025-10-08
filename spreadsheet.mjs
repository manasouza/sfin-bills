/*jshint esversion: 6 */

import { JWT } from 'google-auth-library'
import {GoogleSpreadsheet} from 'google-spreadsheet'
import pkg_u from 'underscore'
import m from 'moment'
const {_} = pkg_u
const { locale } = m
// this declaration supports old require syntax for credentials var
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/'
const credentials = require(TOKEN_DIR + 'SmartFinance-Bills-Beta-eb6d6507173d.json');
const _l = require('lodash')
const _s = require('underscore.string')

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

// The column where category elements of spreadsheet are located
const CATEGORY_COLUMN = process.env.category_column
const MONTHS_ROW = process.env.months_row || 1
const COLUMN_OFFSET = 3

const currency_factor = 100;
let workingColumn;

export async function updateSpreadsheet(dataMap) {
  const jwt = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: SCOPES,
  });
  // spreadsheet key is the long id in the sheets URL
  const doc = new GoogleSpreadsheet(process.env.spreadsheet, jwt);
  await doc.loadInfo()
  const billsSheet = doc.sheetsByIndex[0]
  console.log('[INFO] Loaded doc: %s on first sheet: %s', doc.title, billsSheet.title)

  await monthReference(MONTHS_ROW).then(result => {
    validateFoundMonthReference(result)
    workingColumn = result
  })
  await workingRows(CATEGORY_COLUMN, dataMap).then(async result => {
    await setCellValueForEachCategory(result.data_map, result.category_value_map, workingColumn)
  })

  async function monthReference(monthRowNum) {
    console.log('[DEBUG] getting month reference')
    // TODO: externalize locale
    locale('pt-BR')
    // TODO: externalize date format
    // let current_month = m().subtract(1, 'months').format('MMMM/YYYY')
    let current_month = m().format('MMMM/YYYY')
    console.log('[INFO] current_month: %s', current_month)
    try {
      // await billsSheet.loadCells({ startRowIndex: monthRowNum, startColumnIndex: 2})
      await billsSheet.loadCells({ startRowIndex: monthRowNum, startColumnIndex: 0})
      // it considers merged cells with null value
      for (let i = 1; i < billsSheet.columnCount; i++) {
        const cell = billsSheet.getCell(monthRowNum, i)
        if (cell.value != null && current_month.toLowerCase() === cell.value.toLowerCase()) {
          return cell.columnIndex+COLUMN_OFFSET
        }
      }
    } catch (err) {
      console.log('[ERROR] %s', err)
    }
  }

  function validateFoundMonthReference(workingColumn) {
    if (!workingColumn) {
      console.log("[ERROR] month reference cell not found, so workingColumn not set");
      process.exit(1);
    }
    if (!CATEGORY_COLUMN) {
      console.log("[ERROR] Default category column not set");
      process.exit(1);
    }
  }

  async function workingRows(categoryColumn, dataMap) {
    console.log('[DEBUG] find category cells and set values');
    try {
      await billsSheet.loadCells({ startColumnIndex: categoryColumn})
      var categoryValueMap = new Map();
      for (let row = 1; row < billsSheet.rowCount; row++) {
        const cell = billsSheet.getCell(row, categoryColumn-1)
        if (dataMap.has(cell.value)) {
          categoryValueMap.set(cell.rowIndex, cell.value);
        }
      }
      if (categoryValueMap.length < 1) {
        console.log('[WARN] Nothing found for category mapping. Check if some category changed in spreadsheet')
      }
    } catch (err) {
      console.log('[ERROR] %s', err)
    }
    return {data_map: dataMap, category_value_map: categoryValueMap}
  }

  async function setCellValueForEachCategory(dataMap, categoryValueMap, workingColumn) {
    let workingRow
    if (categoryValueMap.length < 1) {
      console.warn("[WARN] category values not mapped. Stucked here");
    }
    console.log(categoryValueMap.toObject())
    _l.map(categoryValueMap.toObject(), function(billingName, row) {
      workingRow = row
      const workingCell = billsSheet.getCell(workingRow, workingColumn)
      let formulaToUpdate = workingCell.formula
      let cellValue = workingCell.value
      console.log('[DEBUG] cell row: %s / value: %s', workingCell.rowIndex, billingName);
      console.log('[DEBUG] previous cell value: %s', cellValue)
      _l.forEach(dataMap.get(billingName).toArray(), async function (valueToUpdate) {
        let currencyValue = convertToCurrency(valueToUpdate)
        if (_.isNull(cellValue) || _.isEmpty(_s.toString(cellValue))) {
          formulaToUpdate = `=${currencyValue}`;
          cellValue = `=${currencyValue}`
        } else {
          formulaToUpdate = `${formulaToUpdate}+${currencyValue}`;
        }
      })
      if (formulaToUpdate === null) {
        workingCell.value = null
      } else {
        workingCell.formula = formulaToUpdate
      }
    })
    await billsSheet.saveUpdatedCells()
    console.log('[DEBUG] current cell value: %s', billsSheet.getCell(workingRow, workingColumn).value)
  }
}

export function convertToCurrency(value) {
  // TODO: receive format options by config file
  return _s.numberFormat((value/currency_factor),2,',','');
}

export function isAtCurrentMonth(current_month, last_updated_month) {
  if (current_month.toLowerCase() !== last_updated_month.toLowerCase()) {
    return false;
  }
  return true;
}
