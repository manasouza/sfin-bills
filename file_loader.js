/*jshint esversion: 6 */

var fs = require('fs');
var s = require("./node_modules/underscore.string");
var spreadsheet = require('./spreadsheet');
// var HashMap = require('hashmap');
var Map = require("collections/map");
var List = require("collections/list");

var self = module.exports = {
  /**
   * Lists the files which name contains 'Comprovante' and were modified today
   *
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   */
    listSpecificModified : function(auth, google) {
      var service = google.drive('v2');

      // TODO: this date is in UTC timezone. Use moment.js to handle datetime
      var date = new Date();
      var today_date = convertToOnlyDateInISO(date);
      var first_day_of_month_date = convertToOnlyDateInISO(new Date(date.getFullYear(), date.getMonth(), 1));
      var file_id = 'Comprovante';
      var query_filter = `title contains \'${file_id}\' and modifiedDate >= \'${first_day_of_month_date}\' and modifiedDate <= \'${today_date}\'`;
      console.log(`[INFO] Today is ${today_date}`);
      this.getFilesByFilter(query_filter, service, auth);
    },

    getFilesByFilter : function(filter, service, auth) {
        service.files.list({
          auth: auth,
          q: filter
        }, function(err, response) {
          if (err) {
            console.log('The API returned an error: ' + err);
            return;
          }
          self.processFiles(response.items);
      });
    },

    processFiles : function(files) {
      if (files.length == 0) {
        console.log('No files found.');
      } else {
        bills_map = new Map();
        console.log('Files:');
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          console.log('%s (%s)', file.title, file.id);
          this.getBillingValue(file.title);
          this.getReceiptName(file.title);
          if (bills_map.has(receipt_name)) {
            bills_map.get(receipt_name).push(billing_value);
          } else {
            bills_map.set(receipt_name, new List([billing_value]));
          }
        }
        fs.readFile('bills_data_map.json', function process(err, content) {
          if (err) {
            console.log("[ERROR] %s", err);
          }
          var body = JSON.parse(content);
          spreadsheet_map = new Map();
          bills_map.forEach(function(valueList, key) {
            for (var key_value in body) {
              // verifies the key on bills_data_map that fits to receipt name
              if (key.toUpperCase().indexOf(key_value.toUpperCase()) > -1) {
                  console.log('[INFO] Mapping: %s -> %s:%s', body[key_value], key, valueList.toArray());
                  spreadsheet_map.set(body[key_value], valueList);                  
                break;
              }
            }
          });
          spreadsheet.updateSpreadsheet(spreadsheet_map);
        });
      }
    },

    getBillingValue : function(file_title) {
      billing_value = s.strRightBack(file_title, "_");
      // receipt name could have parcels between parenthesis
      billing_value = s.strLeftBack(billing_value, "(");
      billing_value = s.strLeftBack(billing_value, ".");
      var parcels_index = billing_value.indexOf("(");
      // TODO: test parcels value on receipt value
      console.log('parcels: '+parcels_index)
      if (parcels_index > -1) {
        billing_value = billing_value.substring(parcels_index, billing_value.length);
      }
      console.log('billing value = ' + billing_value);
      return s.trim(billing_value);
    },

    getReceiptName : function(file_title) {
      first_limiter_occur = file_title.indexOf("_") + 1;
      last_limiter_occur = file_title.lastIndexOf("_");
      receipt_name = file_title.substring(first_limiter_occur, last_limiter_occur);
      return s.trim(receipt_name);
    }
};

function convertToOnlyDateInISO(date) {
  return date.toISOString().substr(0,date.toISOString().indexOf('T'));
}
