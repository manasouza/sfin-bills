
const http = require('http')
const { google } = require('googleapis');

// var web_server = http.createServeconst http = require('http')r(function (request, response) {
  
// });
// web_server.listen(8322)
// console.log("Web server is up")
async function main() {
    const server = http.createServer(async function (req, res) {
  
    if (req.url.startsWith('/oauth2callback')) {
      let q = url.parse(req.url, true).query;
  
      if (q.error) {
        console.log('Error:' + q.error);
      } else {
        
        // Get access and refresh tokens (if access_type is offline)
        let { tokens } = await oauth2Client.getToken(q.code);
        oauth2Client.setCredentials(tokens);
  
        // Example of using Google Drive API to list filenames in user's Drive.
        const drive = google.drive('v3');
        drive.files.list({
          auth: oauth2Client,
          pageSize: 10,
          fields: 'nextPageToken, files(id, name)',
        }, (err1, res1) => {
          // TODO(developer): Handle response / error.
        });
      }
    }
  })

  server.listen(8322)
  console.log("Web server is up")
}
main()
const client = google.accounts.oauth2.initTokenClient({
    client_id: '299405398705-305hce1carlccrp7k55krl6gsfl95a46.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/drive.metadata.readonly',
    
    // callback function to handle the token response
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) { 
        console.log("Token response: "+ tokenResponse)
        gapi.client.setApiKey('AIzaSyDj1UlfJyAg_95kmyG_mgCXDUWYr_0s-80');
        // gapi.client.load('calendar', 'v3', listUpcomingEvents);
      }
    },
  });
  