var GoogleSpreadsheet = require("google-spreadsheet");
var fs = require('fs');
var m = require('moment')
var _s = require("./node_modules/underscore.string");
// var async = require('async');

// service account created credentials
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/'
var credentials = require(TOKEN_DIR + 'SmartFinance-Bills-Beta-eb6d6507173d.json');
// spreadsheet key is the long id in the sheets URL
// TODO: receive spreadsheet id as an argument (come from HTTP request for example)
var my_sheet = new GoogleSpreadsheet('1zqc0BDV3l5wq7tEzJZF2GhFZUc4e213gaYcT3Zb3OyQ')
var bills_sheet;
var working_col;
var currency_factor = 100;

// TODO: extract the column with all the group cost categories
// TODO: create a comparison table for: "extracted file name x group cost name"
var self = module.exports = {

  updateSpreadsheet : function(data_map) {
  	my_sheet.useServiceAccountAuth(credentials, (err, token) => {
  		my_sheet.getInfo(function(err, info) {
  	    console.log('[INFO] Loaded doc: '+info.title+' by '+info.author.email);
  	    bills_sheet = info.worksheets[0];
  	  	console.log('[INFO] sheet 1: '+bills_sheet.title+' '+bills_sheet.rowCount+'x'+bills_sheet.colCount);
        // TODO: 2 is the months row
  			monthReference(2);
        // TODO: 3 is the categories column
        workingRows(3, data_map, function(data_map, category_rows, category_value_map) {
          category_value_map.forEach(function(value,key) {
            bills_sheet.getCells({
              'min-row': key,
          		'max-row': key,
          		'min-col': working_col,
              'max-col': working_col,
              'return-empty' : true
              }, function (err, cells) {
                cells.forEach(function (cell) {
                  console.log('cell row: ' + cell.row)
                  console.log('value arg: ' + value);
                  cell.setValue(self.convertToCurrency(data_map.get(value)), function(err) {
                    if (err) {
                      console.log("Error at cell.setValue: " + err);
                    }
                  });
                });
              });
            });
          })
  	  });
  	})
  },

  convertToCurrency : function(value) {
    // TODO: receive format options by config file
    return _s.numberFormat((value/currency_factor),2,',','.');
  },

  isAtCurrentMonth : function(current_month, last_updated_month) {
    if (current_month.toLowerCase() !== last_updated_month.toLowerCase()) {
      return false
    }
    return true
  }
}


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

  function monthReference(month_row_num) {
  	// TODO: externalize locale
  	m.locale('pt-BR')
  	bills_sheet.getCells({
  		'min-row': month_row_num,
  		'max-row': month_row_num,
  		'return-empty': false
  	}, function (err, cells) {
      if (err) {
        console.log('Error: ' + err);
      }
  		// TODO: externalize date format
  		var current_month = m().format('MMMM/YYYY')
  		console.log('[INFO] current_month: ' + current_month)
      cells.forEach(function (cell) {
        if (current_month === cell.value) {
          console.log(cell)
          working_col = cell.col;
        }
      });
  	});
  }

  function workingRows(category_col, data_map, callback) {
    bills_sheet.getCells({
      'min-col': category_col,
      'max-col': category_col,
      'return-empty': false
    }, function (err, cells) {
      console.log("[INFO] category names: " + data_map.keys());
      console.log("[INFO] category values: " + data_map.values());
        var category_rows = [];
        var category_value_map = new Map();
        cells.forEach(function (cell) {
          if (data_map.has(cell.value)) {
            category_rows.push(cell.row);
            category_value_map.set(cell.row, cell.value)
          }
        });
        callback(data_map, category_rows, category_value_map);
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
