module.exports = profile

// thing for editing bits of your profile.
// gets saved back to couchdb.
function profile (req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.error(405)
  }

  // get the user's own profile
  req.model.load('profile', req)

  // get the profile of the specified account, if there is one.
  if (req.params && req.params.name) {
    req.model.load('showprofile', req.params.name)
    loadPackages(req, req.params.name)
  }

  req.model.end(function (er, m) {
    if (er) return res.error(er.code, er)
    req.showprofile = m.showprofile || m.profile
    if (m.profile && req.showprofile) {
      req.showprofile.isSelf = req.showprofile.name === m.profile.name
    }
    if (req.showprofile && !(m.starred && m.packages)) {
      loadPackages(req, req.showprofile.name)
      return req.model.end(function (er, m) {
        if (er) return res.error(er)
        showProfile(req, res, req.showprofile)
      })
    }
    showProfile(req, res, req.showprofile)
  })
}

function loadPackages (req, name) {
  req.model.loadAs('browse', 'starred', 'userstar', name, 0, 1000)
  req.model.loadAs('browse', 'packages', 'author', name, 0, 1000)
}

function showProfile (req, res, showprofile) {
  // didn't provide a name, and not logged in
  if (!showprofile) {
    // have to be logged in, or else we don't know who that is
    req.session.set('done', req.url)
    return res.redirect('/login')
  }

  var profile = req.model.profile

  var td = { showprofile: showprofile
           , profile: req.model.profile
           , fields: showprofile.fields
           , title: showprofile.name
           , packages: req.model.packages
           , starred: req.model.starred
           }
  res.template('profile.ejs', td)
}
