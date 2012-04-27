module.exports = function (req, res) {
  // delete the session from couch.
  if (!req.couch.token) {
    return req.session.get('couchdb_token', function (er, token) {
      if (er || !token) return next()
      req.couch.token = token
      req.couch.logout(next)
    })
  }
  req.couch.logout(next)

  function next () {
    // delete the couchdb session, if we have one.
    req.session.del('couchdb_token')
    req.session.del('profile')
    req.session.del("auth", function (er) {
      if (er) return res.error(er)
      // XXX redirect to session.done
      res.sendHTML("<html><body>you are logged out")
    })
  }
}
