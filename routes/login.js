module.exports = login
var url = require("url")
, request = require("request")
, config = require("../config.js")

function login (req, res) {
  switch (req.method) {
    case 'POST': return handleForm(req, res)

    case 'HEAD':
    case 'GET':
      return req.session.get('auth', function (er, data) {
        if (data && !data.error) return res.redirect("/profile")
        res.sendHTML("<html>login, please: " +
                  "<form method='post'><label>u: <input name='name'></label>" +
                  "<label>p: <input type='password' name='password'></label>" +
                  "<input type='submit'></form>")
      })

    default:
      return res.error(405)
  }
}

function handleForm (req, res) {
  req.on('form', function (data) {
    if (!data.name || !data.password) {
      return res.error(new Error('bad login'), 400)
    }

    req.couch.login(data, function (er, cr, couchSession) {
      if (er) return res.error(er)
      if (cr.statusCode !== 200) {
        // XXX Should just render the login form
        // with an error about a bad login or something.
        // Something like:
        // res.template('login.ejs', {message:'bad login'})
        return res.error(er, cr.statusCode)
      }

      // look up the profile data.  we're gonna need
      // it usually anyway.
      var pu = '/_users/org.couchdb.user:' + data.name
      req.couch.get(pu, function (er, cr, data) {
        if (er || cr.statusCode !== 200) {
          return res.error(er, cr && cr.statusCode)
        }

        req.session.set("profile", data)

        // just a convenience.
        res.cookies.set('name', data.name)

        if (data.mustChangePass) {
          return res.redirect('/password')
        }

        res.session.get('done', function (er, done) {
          res.session.del('done')
          res.redirect(done || '/profile')
        })
      })
    })
  })
}
