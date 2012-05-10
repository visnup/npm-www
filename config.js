exports.port = 15443
exports.host = 'localhost'
exports.httpPort = 15080

exports.cluster = { size : require("os").cpus().length }

// redis auth 
exports.redis = { host: '127.0.0.1', port: 6379 }

exports.registryCouch = "https://isaacs.iriscouch.net/"

// npm config settings
exports.npm =
  { loglevel: "warn"
  , registry: "http://registry.npmjs.org/"
  , "strict-ssl": false
  }

// bunyan config
exports.log =
  { name: 'npm-www'
  , level: 'trace'
  }

exports.package = require('./package.json')

exports.errorPage = { debug: true }

exports.debug = true

// probably don't need to change these.
// extra fields we hang on the profile.
exports.profileFields =
{ fullname: "Full Name"
, email: "Email"
, github: "Github Username"
, twitter: "Twitter Username"
, homepage: "Homepage URL"
, freenode: "IRC Handle"
}

exports.emailFrom = '"The npm Website Robot" <webmaster@npmjs.org>'

/*****************/
/* don't delete! */
/*****************/
if (process.env.NODE_ENV === 'production') {
  var admin = require('./config.admin.js')
} else try {
  var admin = require('./config.admin.js')
} catch (er) {
  console.error('Warning: No admin configurations.  Not suitable for production use.')
  return
}
Object.keys(admin).forEach(function (k) {
  if (k === 'redisAuth') exports.redis.auth = admin[k]
  exports[k] = admin[k]
})
