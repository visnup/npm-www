module.exports = showprofile

var gravatar = require('gravatar').url
, npm = require('npm')

function showprofile (name, cb) {
  // get the most recent data for this req.
  npm.registry.get('/-/user/org.couchdb.user:' + name, 0, function (er, data) {

    if (er || !data) return cb(er, data)

    var gr = data.email ? 'retro' : 'mm'
    data.avatar = gravatar(data.email || '', {s:50, d:gr}, true)

    cb(er, data)
  })
}

