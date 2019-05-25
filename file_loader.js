/*jshint esversion: 6 */

const {google} = require('googleapis');

const fs = require('fs');
const s = require("./node_modules/underscore.string");
const Map = require("collections/map");
const Dict = require("collections/dict");
const List = require("collections/list");
const loadedFilesMap = new Dict();

const BluebirdPromise = require('bluebird');
const spreadsheet = BluebirdPromise.promisifyAll(require('./spreadsheet'));

var self = module.exports = {
  /**
   * Lists the files which name contains 'Comprovante' and were modified today
   *
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   */
    listSpecificModified : function(auth) {
      const service = google.drive({
        version: 'v3',
        auth: auth
      });

      // TODO: this date is in UTC timezone. Use moment.js to handle datetime
      let date = new Date();
      const today_date = convertToOnlyDateInISO(date);
      const first_day_of_month_date = convertToOnlyDateInISO(new Date(date.getFullYear(), date.getMonth(), 1));
      const first_day_of_next_month_date = convertToOnlyDateInISO(new Date(date.getFullYear(), date.getMonth() + 1, 1));
      const file_id = 'Comprovante';
      const query_filter = `name contains \'${file_id}\' and modifiedTime >= \'${first_day_of_month_date}\' and modifiedTime < \'${first_day_of_next_month_date}\'`;
      
      console.log(`[INFO] Today is ${today_date}`);
      self.getFilesByFilter(query_filter, service);
    },

    getFilesByFilter : async function(filter, service) {
        try {
          const params = {
            pageSize: 20,
            q: filter
          };
          const response = await service.files.list(params);
          self.processFiles(response.data.files);
        } catch (error) {
          console.log('[ERROR] Could not fetch files: %s', error)
        }
    },

    processFiles : function(files) {
      if (files.length == 0) {
        console.log('No files found.');
      } else {
        // #1 Verify unprocessed files got from GDrive and set then to Map
        let bills_map = new Dict();
        console.log('Files:');
        for (let i = 0; i < files.length; i++) {
          let file = files[i];
          const fileName = file.name
          console.log('[INFO] %s (%s)', fileName, file.id);
          if (!fileAlreadyProcessed(file)) {
            const billing_value = this.getBillingValue(fileName);
            const receipt_name = this.getReceiptName(fileName);
            if (bills_map.has(receipt_name)) {
              bills_map.set(receipt_name+'_'+i, billing_value);
            } else {
              bills_map.set(receipt_name, billing_value);
            }
          } else {
            console.log('[DEBUG] file already processed: %s', fileName);
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
          const bills_data_map_json = JSON.parse(content);
          spreadsheet_map = new Map();
          bills_map.forEach(function(value, key) {
            for (const key_value in bills_data_map_json) {
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
              for (let i = 0; i < files.length; i++) {
                let file = files[i];
                loadedFilesMap.set(file.id, file.name);
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
      let parcels_index = billing_value.indexOf("(");
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
