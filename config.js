exports.keys = [ "super duper secrets go here!" ]

exports.port = 15443

exports.cluster = { size : require("os").cpus().length }

// redis auth 
exports.redis = { host: '127.0.0.1', port: 6379 }

exports.registryCouch = "https://isaacs-staging.iriscouch.net/"

// npm config settings
exports.npm =
  { loglevel: "warn"
  , registry: "http://staging.npmjs.org/"
  , "strict-ssl": false
  }

// bunyan config
exports.log =
  { name: 'npm-www'
  , level: 'trace'
  }

exports.package = require('./package.json')
