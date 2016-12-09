var GoogleSpreadsheet = require("google-spreadsheet");
var fs = require('fs');
var m = require('moment')
// var async = require('async');

// service account created credentials
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/'
var credentials = require(TOKEN_DIR + 'SmartFinance-Bills-Beta-bb915af4e186.json');
// spreadsheet key is the long id in the sheets URL
// TODO: receive spreadsheet id as an argument (come from HTTP request for example)
var my_sheet = new GoogleSpreadsheet('1zqc0BDV3l5wq7tEzJZF2GhFZUc4e213gaYcT3Zb3OyQ')
var bills_sheet;
var working_col;

// TODO: extract the column with all the group cost categories
// TODO: create a comparison table for: "extracted file name x group cost name"
var sheet = function updateSpreadsheet(data_map) {
	console.log("data map: " + data_map);
	my_sheet.useServiceAccountAuth(credentials, (err, token) => {
		my_sheet.getInfo(function(err, info) {
	    console.log('Loaded doc: '+info.title+' by '+info.author.email);
	    bills_sheet = info.worksheets[0];
	  	console.log('sheet 1: '+bills_sheet.title+' '+bills_sheet.rowCount+'x'+bills_sheet.colCount);
      // TODO: 2 is the months row
			monthReference(2, function(month, row, col) {
        console.log('monthReference callback: ' + month +', '+ row +', '+ col);
        // TODO: new column factor: this case is two, because by default, a new month column is a two merged cells
        var new_col = col + 2;
        console.log(new_col);
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
            console.log(month);
      			console.log('row: ' + cell.row + ' - col: ' + cell.col);
            working_col = col;
            cell.setValue(month, function(err) {
              if (err) {
                console.log(err);
              }
            });
      		});
        });
      });
      // TODO: 3 is the categories column
      workingRows(3, data_map, function(low_row, high_row) {
        console.log(low_row + ' ~ ' + high_row);
      })
	  });
	})
}

// function workingRow(rowNum) {
// 	bills_sheet.getRows({
// 		//'row': rowNum,
// 		offset: 1,
// 		limit: 20,
// 		orderby: 'col2'
// 	}, function (err, rows) {
// 		console.log(rows[0].colname)
// 		console.log(rows.length)
// 		rows.forEach(function(row) {
// 			console.log(row.value)
// 		});
// 	});
// }

function monthReference(month_row_num, callback) {
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
		console.log('current_month: ' + current_month)
    var last_updated_month_cell = cells[cells.length -1];
    console.log(last_updated_month_cell);
		// TODO: seems that m().isAfter is not working as expected
		console.log(m().isAfter(m(last_updated_month_cell.numericValue)));
    if (current_month.toLowerCase() !== last_updated_month_cell.value.toLowerCase() && m().isAfter(m(last_updated_month_cell.numericValue))) {
      callback(current_month, last_updated_month_cell.row, last_updated_month_cell.col);
    } else {
      console.log('Already at current month');
      working_col = last_updated_month_cell.col;
    }
	});
}

function workingRows(category_col, data_map, callback) {
  bills_sheet.getCells({
    'min-col': category_col,
    'max-col': category_col,
    'return-empty': false
  }, function (err, cells) {
    console.log(data_map.keys());
    console.log(data_map.values());
      var category_rows = [];
      cells.forEach(function (cell) {
        if (data_map.has(cell.value)) {
          console.log(cell.value);
          category_rows.push(cell.row);
        }
      });
      console.log('categories: ' + category_rows);
      callback(category_rows[0], category_rows[category_rows.length - 1])
  });
}

function workingCells(cb) {
	var max_col = bills_sheet.colCount;
	bills_sheet.getCells({
		'min-col': 1,
		'max-col': max_col,
		'return-empty': false
	}, function (err, cells) {
    console.log('workingCells: ' + cells);
		cells.forEach(function (cell) {
			//console.log('row: ' + cell.row + ' - col: ' + cell.col+'/'+max_col);
		});
	});
}

module.exports = sheet;
