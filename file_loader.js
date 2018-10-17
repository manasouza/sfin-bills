/*jshint esversion: 6 */

var fs = require('fs');
var s = require("./node_modules/underscore.string");
var Map = require("collections/map");
var Dict = require("collections/dict");
var List = require("collections/list");
var loadedFilesMap = new Dict();

var BluebirdPromise = require('bluebird');
var spreadsheet = BluebirdPromise.promisifyAll(require('./spreadsheet'));

const { google } = require('googleapis');

var self = module.exports = {
  /**
   * Lists the files which name contains 'Comprovante' and were modified today
   *
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   */
    listSpecificModified : function(auth) {
      var service = google.drive('v2');

      // TODO: this date is in UTC timezone. Use moment.js to handle datetime
      var date = new Date();
      var today_date = convertToOnlyDateInISO(date);
      var first_day_of_month_date = convertToOnlyDateInISO(new Date(date.getFullYear(), date.getMonth(), 1));
      var first_day_of_next_month_date = convertToOnlyDateInISO(new Date(date.getFullYear(), date.getMonth() + 1, 1));
      var file_id = 'Comprovante';
      var query_filter = `title contains \'${file_id}\' and modifiedDate >= \'${first_day_of_month_date}\' and modifiedDate < \'${first_day_of_next_month_date}\'`;
      console.log(`[INFO] Today is ${today_date}`);
      self.getFilesByFilter(query_filter, service, auth);
    },

    getFilesByFilter : function(filter, service, auth) {
        service.files.list({
          auth: auth,
          q: filter
        }, function(err, response) {
          if (err) {
            console.log('[ERROR] The API returned an error: %s', err);
            process.exit(1);
          }
          self.processFiles(response.items);
      });
    },

    processFiles : function(files) {
      if (files.length == 0) {
        console.log('No files found.');
      } else {
        // #1 Verify unprocessed files got from GDrive and set then to Map
        var bills_map = new Dict();
        console.log('Files:');
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          console.log('[INFO] %s (%s)', file.title, file.id);
          if (!fileAlreadyProcessed(file)) {
            const billing_value = this.getBillingValue(file.title);
            const receipt_name = this.getReceiptName(file.title);
            if (bills_map.has(receipt_name)) {
              bills_map.set(receipt_name+'_'+i, billing_value);
            } else {
              bills_map.set(receipt_name, billing_value);
            }
          } else {
            console.log('[DEBUG] file already processed: %s', file.title);
          }
        }
        if (bills_map.length == 0) {
          console.log('[INFO] no new files to process');
          return;
        }
        // #2 Based on Map previously set, do the mapping with the base bills mapping file
        fs.readFile('bills_data_map.json', function process(err, content) {
          if (err) {
            console.log("[ERROR] %s", err);
          }
          var bills_data_map_json = JSON.parse(content);
          spreadsheet_map = new Map();
          bills_map.forEach(function(value, key) {
            for (var key_value in bills_data_map_json) {
              // verifies the key on bills_data_map that fits to receipt name
              if (key.toUpperCase().indexOf(key_value.toUpperCase()) > -1) {
                console.log('[INFO] Mapping: %s -> %s:%s', bills_data_map_json[key_value], key, value);
                if (spreadsheet_map.has(bills_data_map_json[key_value])) {
                  spreadsheet_map.get(bills_data_map_json[key_value]).push(value);                  
                } else {                  
                  spreadsheet_map.add(new List([value]), bills_data_map_json[key_value]);
                }
                break;
              }
            }
          });
          spreadsheet.updateSpreadsheetAsync(spreadsheet_map)
            .then((result) => {
              for (var i = 0; i < files.length; i++) {
                var file = files[i];
                loadedFilesMap.set(file.id, file.title);
              }
              console.log('[INFO] %s files processed', files.length);
            })
            .catch((err) => {
              console.log("[ERROR] updateSpreadsheet - %s", err);
            });
        });
      }
    },

    getBillingValue : function(file_title) {
      billing_value = s.strRightBack(file_title, "_");
      // receipt name could have parcels between parenthesis
      billing_value = s.strLeftBack(billing_value, "(");
      billing_value = s.strLeftBack(billing_value, ".");
      // TODO: test parcels value on receipt value
      var parcels_index = billing_value.indexOf("(");
      if (parcels_index > -1) {
        billing_value = billing_value.substring(parcels_index, billing_value.length);
      }
      return s.trim(billing_value);
    },

    getReceiptName : function(file_title) {
      first_limiter_occur = file_title.indexOf("_") + 1;
      last_limiter_occur = file_title.lastIndexOf("_");
      receipt_name = file_title.substring(first_limiter_occur, last_limiter_occur);
      return s.trim(receipt_name);
    }
};

function fileAlreadyProcessed(file) {
  if (loadedFilesMap.has(file.id)) {
    return true;
  } else {
    return false;
  }
}

function convertToOnlyDateInISO(date) {
  return date.toISOString().substr(0,date.toISOString().indexOf('T'));
}
