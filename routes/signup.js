module.exports = signup
var config = require("../config.js")

function signup (req, res) {
  switch (req.method) {
    case 'GET': case 'HEAD': return show(req, res)
    case 'POST': return handle(req, res)
    default: return res.error(405)
  }
}

function show (req, res) {
  req.model.load("myprofile", req);
  req.model.end(function(er, m) {
    if (er) return res.error(er);
    res.template('layout.ejs', {
      content: 'signup-form.ejs',
      profile: m.myprofile,
      error: null,
      data: null
    })
  })
}

function handle (req, res) {
  var td = { error: null, data: null }
  req.on('form', function (data) {
    td.data = data
    td.content = 'signup-form.ejs'

    var name = data.name
    , password = data.password
    , verify = data.verify
    , email = data.email

    if (!name || !password || !verify || !email) {
      td.error = 'All fields are required'
    } else if (password !== verify) {
      td.error = "Passwords don't match"
    } else if (name !== name.toLowerCase()) {
      td.error = 'Name can only be lowercase characters'
    } else if (name !== encodeURIComponent(name)) {
      td.error = 'Name cannot contain any non-urlsafe characters'
    } else if (!email.match(/^.+@.+\..+$/)) {
      td.error = 'Email must be valid'
    }

    if (td.error) {
      return res.template('layout.ejs', td, 400)
    }

    // ok, looks maybe ok.
    var acct = { name: name, password: password, email: email }
    req.couch.logout(function (er, cr) {
      if (er) return res.error(er)
      req.couch.signup(acct, function (er, cr, data) {
        if (er || cr && cr.statusCode >= 400) {
          td.error = (er && er.message) || (data && data.error) ||
                     "Failed creating account"
          return res.template('layout.ejs', td, 400)
        }
        // it worked!
        var pu = '/_users/org.couchdb.user:' + data.name
        req.couch.get(pu, function (er, cr, data) {
          if (er || cr && cr.statusCode >= 400) {
            return res.error(er, data && data.error, 500)
          }
          res.session.set('profile', data)
          res.redirect('/profile-edit')
        })
      })
    })
  })
}
