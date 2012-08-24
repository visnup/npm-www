module.exports = profile
var transform = require('./showprofile.js').transform

function profile (req, required, cb) {
  if (typeof required === 'function') cb = required, required = false
  req.session.get('profile', function (er, data) {
    if (!required && er) er = null
    if (er || data) return cb(er, req.profile = transform(data))

    // if we're logged in, try to see if we can get it
    var name = req.cookies.get('name')
    if (!name) return cb()

    var pu = '/_users/org.couchdb.user:' + name
    req.couch.get(pu, function (er, cr, data) {
      if (!required) er = null
      if (er || cr && cr.statusCode !== 200 || !data) {
        // Oh well.  Probably the login expired.
        return cb(er)
      }

      req.session.set('profile', data, function () {
        return cb(null, req.profile = transform(data))
      })
    })
  })
}
