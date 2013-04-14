module.exports = login
var url = require("url")
  , request = require("request")

function login (req, res) {
  switch (req.method) {
    case 'POST': return handleForm(req, res)

    case 'HEAD':
    case 'GET':
      return req.session.get('auth', function (er, data) {
        if (data && !data.error) return res.redirect("/profile")
        req.model.load("profile", req);
        req.model.end(function(er, m) {
          // error just means we're not logged in.
          var locals = {
            profile: m && m.profile,
            error: null
          }

          res.template('login.ejs', locals)
        })
      })

    default:
      return res.error(405)
  }
}

function handleForm (req, res) {
  req.on('form', function (data) {
    if (!data.name || !data.password) {
      return res.template('login.ejs', {error: 'Name or password not provided'})
    }

    req.couch.login(data, function (er, cr, couchSession) {
      if (er) return res.error(er, 'login.ejs')
      if (cr.statusCode !== 200) {
        return res.template('login.ejs', {error: 'Username and/or password is wrong'})
      }

      // look up the profile data.  we're gonna need
      // it usually anyway.
      var pu = '/_users/org.couchdb.user:' + data.name
      req.couch.get(pu, function (er, cr, data) {
        if (er || cr.statusCode !== 200) {
          return res.error(er, 401, 'login.ejs')
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
