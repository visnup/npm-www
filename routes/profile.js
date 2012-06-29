module.exports = profile

var config = require('../config.js')

// thing for editing bits of your profile.
// gets saved back to couchdb.
function profile (req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.error(405)
  }
  // get the user's own profile
  req.model.load('myprofile', req)
  // get the profile of the specified account, if there is one.
  if (req.params.name) {
    req.model.load('profile', req.params.name)
  }

  req.model.end(function (er, m) {
    if (er) return res.error(er)
    req.profile = m.profile || m.myprofile
    if (m.myprofile) {
      req.profile.isSelf = req.profile.name === m.myprofile.name
    }
    showProfile(req, res, req.profile)
  })
}

function showProfile (req, res, profile) {
  // didn't provide a name, and not logged in
  if (!profile) {
    // have to be logged in, or else we don't know who that is
    req.session.set('done', req.url)
    return res.redirect('/login')
  }

  var td = { content: "profile.ejs"
           , profile: profile
           , self: req.model.myprofile
           , fields: config.profileFields }
  res.template('layout.ejs', td)
}
