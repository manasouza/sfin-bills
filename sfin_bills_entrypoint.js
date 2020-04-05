// express-oauth is a Google-provided, open-source package that helps automate
// the authorization process.
const Auth = require('@google-cloud/express-oauth2-handlers');

const listSpecificModified = require('./file_loader').listSpecificModified;

// Specify the access scopes required. If authorized, Google will grant your
// registered OAuth client access to your Google Drive and Google Sheets.
const requiredScopes = [
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/spreadsheets'
];
const auth = Auth('datastore', requiredScopes, 'email', true);

const onSuccess = async (req, res) => {

    console.log("sfinbills entrypoint");
    try {
        // Set up the googleapis library to use the returned tokens.
        email = await auth.auth.authedUser.getUserId(req, res);    
        const OAuth2Client = await auth.auth.authedUser.getClient(req, res, email);
        listSpecificModified(OAuth2Client)    
    } catch (err) {
        console.log(err);
        throw err;
    }
}

// If the authorization process fails, return an error message.
const onFailure = (err, req, res) => {
    console.log(err);
    res.send(`An error has occurred in the authorization process.`);
};

exports.googleDomainVerification = (req, res) => {
    res.status(200).send('<!DOCTYPE html> <html> <head> <meta name="google-site-verification" content="kRMncLYZCZz6L7cmqPtXaCRFQVe1ZeMoEFYUySxzjnY" /> </head> <body> </body> </html>')
};
// Export the Cloud Functions for authorization.
exports.auth_init = auth.routes.init;
exports.auth_callback = auth.routes.cb(onSuccess, onFailure);