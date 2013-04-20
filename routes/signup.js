module.exports = signup
var config = require("../config.js")
var userValidate = require("npm-user-validate")

function signup (req, res) {
  switch (req.method) {
    case 'GET': case 'HEAD': return show(req, res)
    case 'POST': return handle(req, res)
    default: return res.error(405)
  }
}

function show (req, res) {
  req.model.load("profile", req);
  req.model.end(function(er, m) {
    if (er) return res.error(er);
    res.template('signup-form.ejs', {
      profile: m.profile,
      errors: null,
      data: null
    })
  })
}

function handle (req, res) {
  var td = { errors: null, data: null }
  req.on('form', function (data) {
    td.data = data

    var name = data.name
    , password = data.password
    , verify = data.verify
    , email = data.email
    , errors = []

    if (!name || !password || !verify || !email) {
      errors.push(new Error('All fields are required'))
    } else if (password !== verify) {
      errors.push(new Error("Passwords don't match"))
    }

    //colloect other errors
    userValidate.username(name) && errors.push(userValidate.username(name))
    userValidate.pw(password) && errors.push(userValidate.pw(password))
    userValidate.email(email) && errors.push(userValidate.email(email))

    if (errors && errors.length) {
      td.errors = errors
      return res.template('signup-form.ejs', td, 400)
    }

    // ok, looks maybe ok.
    var acct = { name: name, password: password, email: email }
    req.session.del(function (er) {
      if (er) return res.error(er)

      req.couch.signup(acct, function (er, cr, data) {
        if (er || cr && cr.statusCode >= 400 || data && data.error) {
          td.error = "Failed creating account.  CouchDB said: "
                   + ((er && er.message) || (data && data.error))
          return res.template('signup-form.ejs', td, 400)
        }

        req.session.set('profile', data, function (er) {
          if (er) return res.error(er, 500)
          // it worked!  now let them add some details
          return res.redirect('/profile-edit')
        })
      })
    })
  })
}
