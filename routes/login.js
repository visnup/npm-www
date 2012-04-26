module.exports = login
var url = require("url")
, request = require("request")
, config = require("../config.js")

function login (req, res) {
  switch (req.method) {
    case 'POST':
      return req.on('form', function (data) {
        if (!data.user || !data.pass) return loginFail(req, res)

        // verify the data in couch by looking up the user record
        var u = url.parse( config.registryCouch
                         + "/_users/org.couchdb.user:"
                         + data.user )
        u.auth = data.user + ":" + data.pass

        // verify the login
        request({ url: u, json: true }, function (er, r, data) {
          if (er) {
            er.statusCode = r && r.statusCode || 500
            return res.error(er)
          }

          if (r.statusCode !== 200 || data.error) {
            req.session.set("auth", data)
            return res.redirect("/login", 302)
          }

          req.session.set("auth", data)
          return res.redirect("/profile")
        })
      })

    case 'HEAD':
    case 'GET':
      return req.session.get('auth', function (er, data) {
        if (data && !data.error) return res.redirect("/profile")
        res.sendHTML("<html>login, please: " +
                  "<form method='post'><label>u: <input name='user'></label>" +
                  "<label>p: <input type='password' name='pass'></label>" +
                  "<input type='submit'></form>")
      })

    default:
      return res.error(405)
  }

}
