// This is an example only.
// Fill in with appropriate values, uncomment, and rename
// this file to 'config.admin.js' to enable these features.
//
// Every one of these should be set in production.

// The admin user that does admin things on couchdb.
// For instance, resetting user account passwords and such.
exports.couchAuth = null
// exports.couchAuth = "the-username-here:the-password-here"

// The redis authorization password.
// This should match the "requirepass" directive in your
// redis config file.  It should be very long, because redis's
// speed makes it a vulnerable target to brute force attacks.
exports.redisAuth = null
// exports.redisAuth = "redis-super-secret-long-awesome-password-here"

// Keys that are used to sign cookies.
// Should be something more unique and special.  In production, it
// should certainly at least be different from this.
exports.keys = null
// exports.keys = [ "super duper secrets go here!" ]

// Authorization settings for SendGrid email service.
// Without this, you can't send email to users to reset their password.
exports.mailTransportType = null
exports.mailTransportSettings = null
// exports.mailTransportType = "SMTP"
// exports.mailTransportSettings = {
//   service: "SendGrid",
//   auth: {
//     user: "XXXXXXXXXXXXXXXXXX",
//     pass: "XXXXXXXXXXXXXXXXXX"
//   }
// }

// HTTP keys
// Should be PEM strings.  Feel free to read from files.
exports.https = null
// exports.https = {
//   key: fs.readFileSync('ssl/server.key'),
//   cert: fs.readFileSync('ssl/server.crt'),
//   ca: require('./ca.js')
// }
