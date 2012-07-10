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
  if (req.params && req.params.name) {
    req.model.load('profile', req.params.name)
  }

  req.model.end(function (er, m) {
    if (er) return res.error(er)
    req.showprofile = m.profile || m.myprofile
    console.warn("showprofile", req.showprofile)
    if (m.myprofile && req.showprofile) {
      req.showprofile.isSelf = req.showprofile.name === m.myprofile.name
    }
    showProfile(req, res, req.showprofile)
  })
}

function showProfile (req, res, showprofile) {
  // didn't provide a name, and not logged in
  if (!showprofile) {
    // have to be logged in, or else we don't know who that is
    req.session.set('done', req.url)
    return res.redirect('/login')
  }

  var td = { showprofile: showprofile
           , profile: req.model.myprofile
           , fields: config.profileFields }
  res.template('profile.ejs', td)
}
