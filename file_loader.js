var fs = require('fs');
var s = require("./node_modules/underscore.string");
var updateSpreadsheet = require('./spreadsheet');
// var HashMap = require('hashmap');
var Map = require("collections/map");
/**
 * Lists the files which name contains 'Comprovante' and were modified today
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
var list = function listSpecificModified(auth, google) {
  var service = google.drive('v2');

  // TODO: this date is in UTC timezone. Use moment.js to handle datetime
  var date = new Date().toISOString();
  var fdate = date.substr(0,date.indexOf('T'));
  console.log('Today is ' + fdate);

  service.files.list({
    auth: auth,
    maxResults: 10,
	//q: 'title contains \'Comprovante\' and modifiedDate > \''+fdate+'\''
    q: 'title contains \'Comprovante\''
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var files = response.items;
    if (files.length == 0) {
      console.log('No files found.');
    } else {
      bills_map = new Map();
      console.log('Files:');
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        console.log('%s (%s)', file.title, file.id);
        billing_value = s.strRightBack(file.title, "_")
        billing_value = s.strLeftBack(billing_value, ".");
        // TODO: extract value from file name
        console.log(billing_value)
        first_limiter_occur = file.title.indexOf("_") + 1;
        last_limiter_occur = file.title.lastIndexOf("_");
        receipt_name = file.title.substring(first_limiter_occur, last_limiter_occur);
        console.log(receipt_name);
        bills_map.set(receipt_name, billing_value);
      }
      console.log(bills_map)
      fs.readFile('bills_data_map.json', function process(err, content) {
        var body = JSON.parse(content);
        console.log(body);
        // content_map = new Map(strb);
        // console.log('content: ' + content_map);
        spreadsheet_map = new Map();
        bills_map.forEach(function(value, key) {
          console.log(key + " : " + value);
          console.log(body[key]);
          bill_key = body[key];
          spreadsheet_map.set(bill_key, value);
        });
        console.log('spreadsheets: ' + spreadsheet_map);
        // updateSpreadsheet(content);
      });
    }
  });
}

module.exports = list;
