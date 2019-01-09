/*jshint esversion: 6 */

var GoogleSpreadsheet = require("google-spreadsheet");
var fs = require('fs');
var m = require('moment');
var _s = require("./node_modules/underscore.string");
var _ = require('underscore');
var async = require('async');

// service account created credentials
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var credentials = require(TOKEN_DIR + 'SmartFinance-Bills-Beta-eb6d6507173d.json');
// spreadsheet key is the long id in the sheets URL
var my_sheet = new GoogleSpreadsheet(process.env.spreadsheet);
var bills_sheet;
var working_col;
var currency_factor = 100;

var self = module.exports = {

  updateSpreadsheet : function(data_map, saveProcessedFiles) {
  	my_sheet.useServiceAccountAuth(credentials, (err, token) => {
  		my_sheet.getInfo(function(err, info) {
        bills_sheet = info.worksheets[0];
        console.log('[INFO] Loaded doc: %s on first sheet: %s', info.title, bills_sheet.title);
        async.series([
          function (callback) {
            console.log('[DEBUG] getting month reference');
            // TODO: 2 is the months row
            monthReference(2, validateFoundMonthReference);
            callback(null, 'monthReference');
          },
          function (callback) {
            console.log('[DEBUG] find cells and set values');
            // TODO: 3 is the categories column
            workingRows(3, data_map, setCellValueForEachCategory);
            callback(null, 'workingRows');
          }
        ],
        function (err, result) {
          console.log(result);
          saveProcessedFiles();
        });
  	  });
  	});
  },

  convertToCurrency : function(value) {
    // TODO: receive format options by config file
    return _s.numberFormat((value/currency_factor),2,',','');
  },

  isAtCurrentMonth : function(current_month, last_updated_month) {
    if (current_month.toLowerCase() !== last_updated_month.toLowerCase()) {
      return false;
    }
    return true;
  }
};


  function iterateOver(iterator, callback) {
    var current_values = [];
    while (true) {
      var current = iterator.next();
      if (current.done) {
        break;
      }
      console.log(current);
      current_values.push(current.value);
    }
    callback(current_values);
  }

  function monthReference(month_row_num, cb) {
  	// TODO: externalize locale
  	m.locale('pt-BR');
  	bills_sheet.getCells({
  		'min-row': month_row_num,
  		'max-row': month_row_num,
  		'return-empty': false
  	}, function (err, cells) {
      if (err) {
        console.log('[ERROR] %s', err);
      }
  		// TODO: externalize date format
  		var current_month = m().format('MMMM/YYYY');
      var cells_processed = 0;
  		console.log('[INFO] current_month: %s', current_month);
      cells.forEach(function (cell) {
        if (current_month.toLowerCase() === cell.value.toLowerCase()) {
          working_col = cell.col;
        }
        cells_processed++;
        if (cells_processed === cells.length) {
          cb();
        }
      });
  	});
  }
  
  function validateFoundMonthReference() {
    if (!working_col) {
      console.log("[ERROR] month reference cell not found, so working_col not set");
      process.exit(1);
    }
  }

  function workingRows(category_col, data_map, callback) {
    bills_sheet.getCells({
      'min-col': category_col,
      'max-col': category_col,
      'return-empty': false
    }, function (err, cells) {
        if (err) {
          console.log("[ERROR] %s", err);
        }
        var category_rows = [];
        var category_value_map = new Map();
        cells.forEach(function (cell) {
          if (data_map.has(cell.value)) {
            category_rows.push(cell.row);
            category_value_map.set(cell.row, cell.value);
          }
        });
        callback(data_map, category_rows, category_value_map);
    });
  }

function setCellValueForEachCategory(data_map, category_rows, category_value_map) {
  category_value_map.forEach(function (billingName, sheetRow) {
    console.log("[DEBUG] key: %s / working_col: %s", billingName, working_col);
    bills_sheet.getCells({
      'min-row': sheetRow,
      'max-row': sheetRow,
      'min-col': working_col,
      'max-col': working_col,
      'return-empty': true
    }, function (err, cells) {
      if (err != null) {
        console.log("[ERROR] %s", err);
        return;
      }
      cells.forEach(function (cell) {
        console.log('[DEBUG] cell row: %s / value: %s', cell.row, billingName);
        data_map.get(billingName).forEach(function (value, listKey, collection) {
          value = self.convertToCurrency(value);
          if (_.isEmpty(cell._value)) {
            cell.formula = `=${value}`;
          } else {
            cell.formula = `${cell.formula}+${value}`;
          }
        });
        cell.save(function (err) {
          if (err) {
            console.log("[ERROR] error updating spreadsheet: %s", err);
          } else {
            console.log("[INFO] spreadsheet cell updated");
          }
        });
      });
    });
  });
}

  function createNewColumns(month, row, col) {
    console.log('monthReference callback: ' + month +', '+ row +', '+ col);
    // TODO: new column factor: this case is two, because by default, a new month column is a two merged cells
    var new_col = col + 2;
    console.log("[INFO] creating new columns after the last one. factor: " + new_col);
    bills_sheet.resize({ colCount: new_col });
    update_col = bills_sheet.colCount;
    console.log('sheet size col: ' + bills_sheet.colCount);
    bills_sheet.getCells({
      'min-row': row,
      'max-row': row,
      'min-col': update_col,
      'max-col': update_col,
      'return-empty': true
    }, function (err, cells) {
      cells.forEach(function (cell) {
        console.log('month: ' +month);
        console.log('row: ' + cell.row + ' - col: ' + cell.col);
        working_col = col;
        cell.setValue(month, function(err) {
          if (err) {
            console.log(err);
          }
        });
      });
    });
  }
