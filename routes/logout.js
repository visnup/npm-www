module.exports = function (req, res) {
  // delete the session from couch.
  // also delete any other login bits.
  req.couch.logout(next)

  function next () {
    // delete the couchdb session, if we have one.
    req.session.del('profile', function (er) {
      if (er) return res.error(er)
      // XXX redirect to session.done
      res.sendHTML("<html><body>you are logged out")
    })
  }
}
