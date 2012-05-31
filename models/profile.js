module.exports = profile

var callresp = require('cluster-callresp')

function profile (req, name, cb) {
  // get the most recent data for this req.
  callresp({ cmd: 'registry.get'
           , name: '/-/user/org.couchdb.user:' + name
           , maxAge: 0
           , stale: false
           }, cb)
}

