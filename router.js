// XXX Maybe split route handlers into separate modules?
// Could do some kind of fs.readdir and then require them all.

var routes = require("routes")
, Router = routes.Router
, Route = routes.Route
, filed = require("filed")
, router = new Router()
, path = require('path')
, callresp = require("cluster-callresp")
, errors = require("./errors.js")
, request = require("request")
, url = require("url")
, config = require("./config.js")


module.exports = router

// static stuff serves out of the static folder.
router.addRoute("/-/static/*", function (req, res) {
  var f = path.join("/", req.splats.join('/'))
  var d = path.join(__dirname, 'static', f)
  filed(d).pipe(res)
})

router.addRoute("/favicon.ico", function (req, res) {
  filed("favicon.ico").pipe(res)
})

router.addRoute("/-/login", function (req, res) {
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
            return res.redirect("/-/login", 302)
          }

          console.error("auth data", data)
          req.session.set("auth", data)
          return res.redirect("/-/profile")
        })
      })

    case 'HEAD':
    case 'GET':
      return req.session.get('auth', function (er, data) {
        console.error("auth in /-/login", er, data)
        if (data && !data.error) return res.redirect("/-/profile")
        res.sendHTML("<html>login, please: " +
                  "<form method='post'><label>u: <input name='user'></label>" +
                  "<label>p: <input type='password' name='pass'></label>" +
                  "<input type='submit'></form>")
      })
  }

})

router.addRoute("/-/profile", function (req, res) {
  req.session.get("auth", function (er, data) {
    if (er) return res.error(er)
    res.sendJSON(data)
  })
})

router.addRoute("/-/logout", function (req, res) {
  req.session.del("auth", function (er) {
    if (er) return res.error(er)
    res.sendHTML("<html><body>you are logged out")
  })
})


// any other /-/special routes should 404
router.addRoute("/-/*", errors(404))
router.addRoute("/-", errors(404))



// The package details page
var LRU = require("lru-cache")
, regData = new LRU(10000)
, marked = require("marked")

router.addRoute("/:name/:version", packagePage)
router.addRoute("/:name", packagePage)
function packagePage (req, res) {
  var name = req.params.name
  , version = req.params.version

  var k = name + '/' + (version || '')
  , data = regData.get(k)

  if (data) return showReadme(data, req, res)

  // go get the package.
  callresp({ cmd: 'registry.get'
           , name: name
           , version: version }, function (er, data) {
    if (er) return res.error(er)

    regData.set(k, data)

    return showReadme(data, req, res)
  })
}

function showReadme (data, req, res) {
  if (data.readme) {
    return res.sendHTML(marked.parse(data.readme))
  }

  res.sendJSON(data)
}
