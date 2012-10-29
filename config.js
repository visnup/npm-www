exports.port = 15443
exports.host = 'localhost'
exports.httpPort = 15080

exports.cluster = { size : require("os").cpus().length }

// redis auth 
exports.redis = { host: '127.0.0.1', port: 6379 }

exports.registryCouch = "https://isaacs.iriscouch.com/"

// npm config settings
exports.npm =
  { loglevel: "warn"
  , registry: "http://registry.npmjs.org/"
  , "strict-ssl": false
  , _auth: ''
  , username: ''
  , _password: ''
  }

// bunyan config
exports.log =
  { name: 'npm-www'
  , level: 'trace'
  }

exports.package = require('./package.json')
exports.contributors = require('fs').readFileSync('AUTHORS', 'utf8')

exports.errorPage = { debug: true }

exports.debug = true

// probably don't need to change these too often.
// extra fields we hang on the profile.
// format: [title, display template, url test]
// if it doesn't have a url test, then urls are not allowed.
// The actual value is escaped, so no markup is allowed ever.
exports.profileFields =
{ fullname: [ 'Full Name', '%s' ]
, email: [ 'Email', '<a href="mailto:%s">%s</a>', function (u) {
    return u.protocol === 'mailto:'
  } ]
, github: [ 'Github', '<a href="https://github.com/%s">%s</a>',
    hostmatch(/^github.com$/) ]
, twitter: [ 'Twitter', '<a href="https://twitter.com/%s">@%s</a>',
    hostmatch(/^twitter.com$/) ]
, appdotnet: [ 'App.net', '<a href="https://alpha.app.net/%s">%s</a>',
    hostmatch(/app.net$/) ]
, homepage: [ 'Homepage', '<a href="%s">%s</a>',
    hostmatch(/[^\.]+\.[^\.]+$/) ]
, freenode: [ 'IRC Handle', '%s' ]
}

function hostmatch (m) { return function (u) {
  return u.host && u.host.match(m)
} }

exports.emailFrom = '"The npm Website Robot" <webmaster@npmjs.org>'

// For development only!
// Don't send 304s for templar (still does for styl and some others)
// npm config set npm-www:nocache 1
exports.nocache = process.env.npm_package_config_nocache === '1'

exports.templateOptions = {
  cache: !exports.nocache
}


/*****************/
/* don't delete! */
/*****************/
var env = process.env.NODE_ENV
var admin
if (env === 'production') {
  admin = require('./config.admin.js')
} else try {
  if (env !== 'dev') {
    admin = require('./config.admin.js')
  } else {
    admin = require('./config.dev.js')
  }
} catch (er) {
  console.error('Warning: No admin configurations.  Not suitable for production use.')
  admin = {}
}

Object.keys(admin).forEach(function (k) {
  if (k === 'redisAuth') exports.redis.auth = admin[k]
  exports[k] = admin[k]
})

if (module === require.main) {
  // just show the configs
  console.log(exports)
  process.exit(0)
}
