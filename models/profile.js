module.exports = profile

var callresp = require('cluster-callresp')
, gravatar = require('gravatar')

function profile (name, cb) {
  // get the most recent data for this req.
  callresp({ cmd: 'registry.get'
           , name: '/-/user/org.couchdb.user:' + name
           , maxAge: 0
           , stale: false
           }, function (er, data) {
    if (er || !data) return cb(er, data)
    if (data.email) {
      data.gravatar = gravatar(data.email, {s:50, d:'retro'}, true)
    }
    cb(er, data)
  })
}

