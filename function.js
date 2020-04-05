/**
 * Copyright 2018, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 * Code Reference:
 * https://github.com/GoogleCloudPlatform/community/blob/master/tutorials/cloud-functions-oauth-gmail/index.js
 */
'use strict';

const fs = require('fs');
const { google } = require('googleapis');

// Configuration constants
const GCF_REGION = process.env.GCF_REGION;
const GCLOUD_PROJECT = process.env.GCP_PROJECT_ID;
const SCOPES = [
    'https://www.googleapis.com/auth/drive.metadata.readonly'
];

// Retrieve OAuth2 config
const clientSecretJson = JSON.parse(fs.readFileSync('./client_secret.json'));
const oauth2Client = new google.auth.OAuth2(
  clientSecretJson.web.client_id,
  clientSecretJson.web.client_secret,
  `https://${GCF_REGION}-${GCLOUD_PROJECT}.cloudfunctions.net/oauth2callback`
);
const listSpecificModified = require('./file_loader').listSpecificModified;

let currentToken

/**
 * This should be provided during setup, to add a valid domain for the CFs and is required for OAuth configs.
 * It uses search.google.com/search-console (URL prefix)
 */
exports.googleDomainVerification = (req, res) => {
    res.status(200).send('<!DOCTYPE html> <html> <head> <meta name="google-site-verification" content="kRMncLYZCZz6L7cmqPtXaCRFQVe1ZeMoEFYUySxzjnY" /> </head> <body> </body> </html>')
};

/**
 * Request an OAuth 2.0 authorization code
 */
exports.oauth2init = (req, res) => {  
    // Parse session cookie
    // Note: this presumes 'token' is the only value in the cookie
    const cookieStr = (req.headers.cookie || '').split('=')[1]
    // Remove ;SACSID
    const cookieJson = cookieStr ? cookieStr.split(';')[0] : null
    console.log('oauth2init cookie: '+cookieJson);    
    const token = cookieJson ? JSON.parse(decodeURIComponent(cookieJson)) : null
    console.log('oauth2init token: '+token);    

    // If the current OAuth token hasn't expired yet, go to /entrypoint
    if (token && token.expiry_date && token.expiry_date >= Date.now() + 60000) {
        return res.redirect('/entrypoint');
    }
    // Generate + redirect to OAuth2 consent form URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'online',
      scope: SCOPES
    });
    res.redirect(authUrl);
};


/**
 * Get an access token from the authorization code and store token in a cookie
 */
exports.oauth2callback = (req, res) => {
    // Get authorization code from request
    const code = req.query.code;
  
    return new Promise((resolve, reject) => {
      // OAuth2: Exchange authorization code for access token
      oauth2Client.getToken(code, (err, token) => {
        if (err) {
          return reject(err);
        }
        return resolve(token);
      });
    })
    .then((token) => {
        const currentToken = JSON.stringify(token);
        process.env.token = currentToken;
        // Respond with OAuth token stored as a cookie
        res.cookie('token', currentToken);

        console.log("REDIRECTING TO ENTRYPOINT with: "+currentToken);
        
        res.redirect('/entrypoint');
    })
    .catch((err) => {
        // Handle error
        console.error(err);
        res.status(500).send('Something went wrong; check the logs.');
    });
};

exports.entrypoint = (req, res) => {
    console.log("ENTERING AT ENTRYPOINT");
    // Parse session cookie
    // Note: this presumes 'token' is the only value in the cookie
    const cookieStr = (req.headers.cookie || '').split('=')[1]
    // Remove ;SACSID
    const cookieJson = cookieStr ? cookieStr.split(';')[0] : null
    const token = cookieJson ? JSON.parse(decodeURIComponent(cookieJson)) : null;
    console.log('entrypoint token: '+token);
    console.log('entrypoint currentToken: '+process.env.token)    
    // If the current OAuth token hasn't expired yet, go to /entrypoint
    if (token && token.expiry_date && token.expiry_date >= Date.now() + 60000) {
        oauth2Client.setCredentials(token);
    } else {
        console.log('current token: '+currentToken);
        oauth2Client.setCredentials(currentToken);
    }
    listSpecificModified(oauth2Client) 
};