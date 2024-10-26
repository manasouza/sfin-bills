/*jshint esversion: 6 */

import { updateSpreadsheet } from './spreadsheet.mjs';
import {google} from 'googleapis'
import {PubSub} from '@google-cloud/pubsub'
import pkg_us from 'underscore.string'
import pkg_dict from 'collections/dict.js'
import pkg_list from 'collections/list.js'
import {Firestore} from '@google-cloud/firestore'
import pkg_map from 'collections/map.js'

const {Map} = pkg_map
const {Dict} = pkg_dict
const {List} = pkg_list
const {strRightBack, strLeftBack, trim} = pkg_us
const projectId = 'smartfinance-bills-beta'

const db = new Firestore({
  projectId: projectId,
  keyFilename: process.env.credentials,
})
const billsCategoryMap = db.collection('bills_config').doc(process.env.document_cfg ? process.env.document_cfg : 'bills_mapping_test')
const pubSubClient = new PubSub(projectId)

const FILENAME_DATA_SEPARATOR = "_"
const FILENAME_FIELDS_LENGTH = 3

/**
 * Lists the files which name contains 'Comprovante' and were modified today
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
export function listSpecificModified(auth) {
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
  // const query_filter = `name contains \'${file_id}\' and modifiedTime >= \'2021-09-01\' and modifiedTime < \'2021-10-01\'`;
  const query_filter = `name contains \'${file_id}\' and modifiedTime >= \'${first_day_of_month_date}\' and modifiedTime < \'${first_day_of_next_month_date}\'`;

  console.log(`[INFO] Today is ${today_date}`);
  getFilesByFilter(query_filter, service);
}

export async function getFilesByFilter(filter, service) {
    try {
      const params = {
        pageSize: 20,
        q: filter
      };
      const response = await service.files.list(params);
      processFiles(response.data.files);
    } catch (error) {
      console.log('[ERROR] Could not fetch files: %s', error.message)
      if (error.message.includes("grant")) {
        console.log('[ERROR] %s. Check token expiration', error)
      }
    }
}

export async function processFiles(files) {
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
      if (fileName.split(FILENAME_DATA_SEPARATOR).length < FILENAME_FIELDS_LENGTH) {
        console.log('[INFO] skip filename: %s which is not according standards', fileName)
        continue
      }
      if (!await fileAlreadyProcessed(file)) {
        const billingValue = getBillingValue(fileName);
        const receiptName = getReceiptName(fileName);
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
    const spreadsheetMap = new Map()
    if (!mappingDoc.exists) {
      console.log('[ERROR] no mapping category found for bills. Check database configuration.')
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
          publishMessage('sfinbills', receiptName).catch(err => {
            console.error(err.message);
            process.exitCode = 1;
          })
          files = files.filter(file => !file.name.includes(receiptName) && !file.name.includes(value))
          console.log('[DEBUG] content of files to be processed changed: %s', files)
        }
      })
      if (spreadsheetMap.size === 0) {
        console.log("[INFO] no new registries found to be categorized")
      } else {
        updateSpreadsheet(spreadsheetMap)
          .then((result) => {
            for (let i = 0; i < files.length; i++) {
              let file = files[i];
              let billsData = db.collection(process.env.collection).doc(file.id)
              billsData.set({file_name: file.name})
            }
            console.log('[INFO] %s files processed', files.length);
          })
          .catch((err) => {
            console.log("[ERROR] updateSpreadsheet - %s", err);
          })
      }
    }
  }
}

export function getBillingValue(file_title) {
  let billing_value = strRightBack(file_title, "_");
  // receipt name could have parcels between parenthesis
  billing_value = strLeftBack(billing_value, "(");
  billing_value = strLeftBack(billing_value, ".");
  // TODO: test parcels value on receipt value
  let parcels_index = billing_value.indexOf("(");
  if (parcels_index > -1) {
    billing_value = billing_value.substring(parcels_index, billing_value.length);
  }
  return trim(billing_value);
}

export function getReceiptName(file_title) {
  let first_limiter_occur = file_title.indexOf("_") + 1;
  let last_limiter_occur = file_title.lastIndexOf("_");
  const receipt_name = file_title.substring(first_limiter_occur, last_limiter_occur);
  return trim(receipt_name);
}

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

async function publishMessage(topic, data) {
  const dataBuffer = Buffer.from(data)
  try {
    const messageId = await pubSubClient
      .topic(topic)
      .publishMessage({data: dataBuffer});
    console.log(`[INFO] message ${messageId} published.`);
  } catch (error) {
    console.error(`Received error while publishing: ${error.message}`);
    process.exitCode = 1;
  }
}

function convertToOnlyDateInISO(date) {
  return date.toISOString().substr(0,date.toISOString().indexOf('T'));
}
