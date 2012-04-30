module.exports = profile

var callresp = require("cluster-callresp")

// thing for editing bits of your profile.
// gets saved back to couchdb.
function profile (req, res) {

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.error(405)
  }
  req.session.get('profile', function (er, prof) {
    req.profile = prof
    showProfile(req, res)
  })
}

function showProfile (req, res) {
  var name = req.params.name

  if (!name) {
    if (!req.profile || !req.profile.name) {
      // have to be logged in, or else we don't know who that is
      req.session.set('done', req.url)
      return res.redirect('/login')
    }
    name = req.profile.name
  }

  // get the most recent data for this req.
  callresp({ cmd: 'registry.get'
           , name: '/-/user/org.couchdb.user:' + name
           , maxAge: 0
           , stale: false
           }, function (er, data) {
    if (er) return res.error(er)
    data.isSelf = req.profile && name === req.profile.name
    res.template('profile.ejs', {profile: data, self: req.profile })
  })
}
