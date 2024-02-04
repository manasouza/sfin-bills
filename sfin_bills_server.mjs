import { fileloader } from './file_loader.mjs'

import {http} from 'http'
import {fs} from 'fs'
import {readline} from 'readline'
import { google } from 'googleapis'

const listSpecificModified = fileloader.listSpecificModified;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
const CRED_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/'
const TOKEN_PATH = CRED_DIR + 'token.json';

var web_server = http.createServer(function (request, response) {
  // Load client secrets from a local file.
  fs.readFile(CRED_DIR + 'client_secret.json', (err, content) => {
    if (err) {
      console.log('[ERROR] Error loading client secret file:', err);
      process.exit(1);
    }
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), listSpecificModified);
  });  
  response.end()
});
web_server.listen(8321)
console.log("Web server is up")

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  // const auth = new google.auth();
  const oAuth2Client = new google.auth.OAuth2(
    client_id, 
    client_secret, 
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        console.error('[ERROR] Error while trying to retrieve access token', err);
        process.exit(1);
      }
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('[INFO] Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

