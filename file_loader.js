/*jshint esversion: 6 */

const {google} = require('googleapis');

const fs = require('fs');
const s = require("./node_modules/underscore.string");
const Map = require("collections/map");
const Dict = require("collections/dict");
const List = require("collections/list");
const Firestore = require('@google-cloud/firestore');

const BluebirdPromise = require('bluebird');
const spreadsheet = BluebirdPromise.promisifyAll(require('./spreadsheet'));

const db = new Firestore({
  projectId: 'smartfinance-bills-beta',
  keyFilename: process.env.credentials,
});
const billsCategoryMap = db.collection('bills_config').doc('mapping')

const FILENAME_DATA_SEPARATOR = "_"
const FILENAME_FIELDS_LENGTH = 3

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
          console.log('[ERROR] Could not fetch files: %s', error.message)
          if (error.message.includes("grant")) {
            console.log('[ERROR] %s. Check token expiration', error)
          }
        }
    },

    processFiles : async function(files) {
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
          console.log(fileName.split(FILENAME_DATA_SEPARATOR).length)
          if (fileName.split(FILENAME_DATA_SEPARATOR).length < FILENAME_FIELDS_LENGTH) {
            console.log('[INFO] skip filename: %s which is not according standards', fileName)
            continue
          }
          if (!await fileAlreadyProcessed(file)) {
            const billingValue = this.getBillingValue(fileName);
            const receiptName = this.getReceiptName(fileName);
            if (bills_map.has(receiptName)) {
              bills_map.set(receiptName+FILENAME_DATA_SEPARATOR+i, billingValue);
            } else {
              bills_map.set(receiptName, billingValue);
            }
          } else {
            console.log('[DEBUG] file already processed: %s', fileName);
          }
        }
        if (bills_map.length == 0) {
          console.log('[INFO] no new files to process');
          return;
        }
        // #2 Based on Map previously set, do the mapping with the base bills mapping config
        const mappingDoc = await billsCategoryMap.get()
        spreadsheetMap = new Map()
        if (!mappingDoc.exists) {
          console.log('[ERROR] no mapping category found for bills')
          return;
        } else {
          bills_map.forEach(function(value, receiptName) {
            // verifies the key on bills_data_map that fits to receipt name
            console.log('[DEBUG] get config value from key: %s', receiptName)
            let categoryValue = mappingDoc.get(receiptName.toLowerCase().split(FILENAME_DATA_SEPARATOR)[0])
            if (categoryValue) {
              console.log('[INFO] Mapping: %s -> %s:%s', categoryValue, receiptName, value)
              if (spreadsheetMap.has(categoryValue)) {
                spreadsheetMap.get(categoryValue).push(value)
              } else {
                spreadsheetMap.add(new List([value]), categoryValue)
              }
            } else {
              console.log('[WARN] category not found: %s', receiptName)
            }
          })
          spreadsheet.updateSpreadsheetAsync(spreadsheetMap)
            .then((result) => {
              for (let i = 0; i < files.length; i++) {
                let file = files[i];
                let billsData = db.collection('bills').doc(file.id)
                billsData.set({file_name: file.name})
              }
              console.log('[INFO] %s files processed', files.length);
            })
            .catch((err) => {
              console.log("[ERROR] updateSpreadsheet - %s", err);
            })
        }
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

async function fileAlreadyProcessed(file) {
  let alreadyProcessed = false
  const querySnapshot = await db.collection('bills').get()
  querySnapshot.forEach((doc) => {
    if (doc.id == file.id) {
      console.log('[DEBUG %s => %s', doc.id, doc.data())
      alreadyProcessed = true
    }
  })
  return alreadyProcessed
}

function convertToOnlyDateInISO(date) {
  return date.toISOString().substr(0,date.toISOString().indexOf('T'));
}
