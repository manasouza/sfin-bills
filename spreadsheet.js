var GoogleSpreadsheet = require("google-spreadsheet");
var fs = require('fs');
var m = require('moment')
// var async = require('async');

// service account created credentials
var credentials = require('./SmartFinance-Bills-Beta-bb915af4e186.json');
// spreadsheet key is the long id in the sheets URL
// TODO: receive spreadsheet id as an argument (come from HTTP request for example)
var my_sheet = new GoogleSpreadsheet('1zqc0BDV3l5wq7tEzJZF2GhFZUc4e213gaYcT3Zb3OyQ')
var bills_sheet;

// TODO: extract the column with all the group cost categories
// TODO: create a comparison table for: "extracted file name x group cost name"
// function updateSpreadsheet() {
	my_sheet.useServiceAccountAuth(credentials, (err, token) => {
		my_sheet.getInfo(function(err, info) {
	    console.log('Loaded doc: '+info.title+' by '+info.author.email);
	    bills_sheet = info.worksheets[0];
	  	console.log('sheet 1: '+bills_sheet.title+' '+bills_sheet.rowCount+'x'+bills_sheet.colCount);
			monthReference(2);
			workingCells();
	  });
	})
// }

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

function monthReference(monthRowNum) {
	// TODO: externalize locale
	m.locale('pt-BR')
	bills_sheet.getCells({
		'min-row': monthRowNum,
		'max-row': monthRowNum,
		'return-empty': false
	}, function (err, cells) {
		// TODO: externalize date format
		var currentMonth = m().format('MMMM/YYYY')
		console.log(currentMonth)
		var lastUpdatedMonth = m(cells[cells.length -1])
		// console.log(m(currentMonth).isAfter(lastUpdatedMonth));
		console.log(m().isAfter(lastUpdatedMonth));
		if (currentMonth !== lastUpdatedMonth) {
			// TODO: Add 2 columns and merge cell with month information
		}
		// TODO: update cell
		cells.forEach(function (cell) {
				console.log(cell.value)
		});
	});
}

function workingCells(cb) {
	var max_col = bills_sheet.colCount;
	bills_sheet.getCells({
		'min-col': 1,
		'max-col': max_col,
		'return-empty': false
	}, function (err, cells) {
		cells.forEach(function (cell) {
			//console.log('row: ' + cell.row + ' - col: ' + cell.col+'/'+max_col);
		});
	});
}
