module.exports = myprofile

function myprofile (req, cb) {
  req.session.get('profile', function (er, prof) {
    if (er || prof) return cb(er, prof)
    // if we're logged in, try to see if we can get it
    var name = req.cookies.get('name')
    if (!name) return cb()
    var pu = '/_users/org.couchdb.user:' + name
    req.couch.get(pu, function (er, cr, data) {
      if (er || cr.statusCode !== 200) {
        // Oh well.  Probably the login expired.
        return cb(er)
      }
      req.session.set('profile', data)
      return cb(null, data)
    })
  })
}
