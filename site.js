// this is the request handler for the site.

module.exports = site

var router = require("./router.js")
, errors = require("./errors.js")
, domain = require("domain")
, config = require("./config.js")
, Cookies = require("cookies")
, Keygrip = require("keygrip")
, keys = new Keygrip(config.keys)
, Negotiator = require("negotiator.js")
, RedisSession = require("./redis-session.js")
, url = require("url")

RedisSession.createClient(config.redis)

function site (req, res) {
  // handle unexpected errors relating to this request.
  var d = domain.create()
  d.add(req)
  d.add(res)
  d.on("error", function (er) {
    try {
      errors(er, req, res)
      res.on("close", function () {
        d.dispose()
      })
    } catch (er) {
      d.dispose()
    }
  })

  // set up various decorations
  req.cookies = res.cookies = new Cookies(req, res, keys)
  req.negotiator = new Negotiator(req)
  req.session = res.session = new RedisSession(req, res)

  // allow stuff like "req.pathname", etc.
  var u = url.parse(req.url)
  delete u.auth
  Object.keys(u, true).forEach(function (k) {
    req[k] = u[k]
  })

  res.error = function (er) {
    errors(er, req, res)
  }

  res.sendJSON = function (obj, status) {
    res.statusCode = status || res.statusCode || 200
    res.setHeader('content-type', 'application/json')
    // XXX weakmap would be awesome to avoid doing this
    // repeatedly for the same object.
    var j = new Buffer(JSON.stringify(obj))
    res.setHeader('content-length', j.length)
    res.end(j)
  }

  res.sendHTML = function (data, status) {
    res.statusCode = status || res.statusCode || 200
    res.setHeader('content-type', 'text/html')
    // XXX weakmap would be awesome to avoid doing this
    // repeatedly for the same object.
    var j = new Buffer(data)
    res.setHeader('content-length', j.length)
    res.end(j)
  }


  var route = router.match(req.url)
  if (!route) return errors(404, req, res)

  Object.keys(route).forEach(function (k) {
    req[k] = route[k]
  })

  route.fn(req, res)
}

