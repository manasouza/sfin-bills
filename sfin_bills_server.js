var http = require('http');
var fs = require('fs');
var vm = require('vm');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
require('sprintf-js');
var m = require('module');
var listSpecificModified = require('./file_loader');

var SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly']
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/'
var DRIVE_TOKEN_PATH = TOKEN_DIR + 'drive-nodejs-quickstart.json'

// service account created credentials
var spreadsheets_api_credentials = require(TOKEN_DIR + 'SmartFinance-Bills-Beta-bb915af4e186.json')

var web_server = http.createServer(function (resquest, response) {
  // TODO: when loading the other js files, it was impossible to use 'require' function at them
  //      changed to export functions on these files. Let's follow up to undestand some impact on don't use vm.sunInThisContext
  // vm.runInThisContext(fs.readFileSync('file_loader.js'))
  // vm.runInThisContext(fs.readFileSync('spreadsheet.js'))
  fs.readFile(TOKEN_DIR + 'client_secret.json', function processClientSecrets(err, content) {
    if (err) {
      console.log('Error loading client secret file: ' + err);
      return;
    }
    // Authorize a client with the loaded credentials, then call the Drive API.
    authorize(JSON.parse(content), listSpecificModified);
  });
  // updateSpreadsheet();
  response.end()
});
web_server.listen(8321)
console.log("Web server is up")

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token for Drive API.
  fs.readFile(DRIVE_TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client, google);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(DRIVE_TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + DRIVE_TOKEN_PATH);
}
