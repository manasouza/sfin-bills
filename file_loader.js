var fs = require('fs');
var s = require("./node_modules/underscore.string");
var updateSpreadsheet = require('./spreadsheet');
// var HashMap = require('hashmap');
var Map = require("collections/map");

var self = module.exports = {
  /**
   * Lists the files which name contains 'Comprovante' and were modified today
   *
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   */
    listSpecificModified : function(auth, google) {
      var service = google.drive('v2');

      // TODO: this date is in UTC timezone. Use moment.js to handle datetime
      var date = new Date().toISOString();
      var fdate = date.substr(0,date.indexOf('T'));
      console.log('Today is ' + fdate);

      this.getFilesByFilter('Comprovante', service, auth);
    },

    getFilesByFilter : function(filter, service, auth) {
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
          this.getBillingValue(file.title)
          first_limiter_occur = file.title.indexOf("_") + 1;
          last_limiter_occur = file.title.lastIndexOf("_");
          receipt_name = file.title.substring(first_limiter_occur, last_limiter_occur);
          bills_map.set(receipt_name, billing_value);
        }
        console.log(bills_map)
        fs.readFile('bills_data_map.json', function process(err, content) {
          var body = JSON.parse(content);
          console.log('bills_data_map: ' + body);
          spreadsheet_map = new Map();
          bills_map.forEach(function(value, key) {
            for (var key_value in body) {
              // verifies the key on bills_data_map that fits to receipt name
              if (key.toUpperCase().indexOf(key_value.toUpperCase()) > -1) {
                console.log(body[key_value] + ' --- ' + key);
                spreadsheet_map.set(body[key_value], value);
                break;
              }
            }
          });
          updateSpreadsheet(spreadsheet_map);
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
    }
}
