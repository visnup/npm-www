module.exports = profile

var gravatar = require('gravatar').url
, npm = require('npm')

function profile (name, cb) {
  // get the most recent data for this req.
  npm.registry.get('/-/user/org.couchdb.user:' + name, 0, function (er, data) {

    if (er || !data) return cb(er, data)
    if (data.email) {
      data.gravatar = gravatar(data.email, {s:50, d:'retro'}, true)
    }
    cb(er, data)
  })
}

