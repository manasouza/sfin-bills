var s = require("./bower_components/underscore.string");

/**
 * Lists the files which name contains 'Comprovante' and were modified today
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
var list = function listSpecificModified(auth, google) {
  var service = google.drive('v2');

  // TODO: this date is in UTC timezone. Use moment.js to handle datetime
  var date = new Date().toISOString();
  var fdate = date.substr(0,date.indexOf('T'));
  console.log('Today is ' + fdate);

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
    var files = response.items;
    if (files.length == 0) {
      console.log('No files found.');
    } else {
      console.log('Files:');
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        console.log('%s (%s)', file.title, file.id);
        billing_value = s.strRightBack(file.title, "_");
      }
    }
    // TODO: extract value from file name
    console.log(billing_value)
    // TODO: extract name of receipt
  });
}

module.exports = list;
