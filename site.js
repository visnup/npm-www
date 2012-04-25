// this is the request handler for the site.

module.exports = site

var router = require("./router.js")
, errors = require("./errors.js")
, domain = require("domain")
, config = require("./config.js")
, Cookies = require("cookies")
, Keygrip = require("keygrip")
, keys = new Keygrip(config.keys)
, Negotiator = require("negotiator")
, RedSess = require("redsess")
, url = require("url")
, StringDecoder = require('string_decoder').StringDecoder
, qs = require("querystring")

RedSess.createClient(config.redis)

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
  // TODO: Move some/all of this into a separate module.

  req.cookies = res.cookies = new Cookies(req, res, keys)
  req.negotiator = new Negotiator(req)
  req.neg = req.negotiator
  req.session = res.session = new RedSess(req, res)

  // don't print out that dumb 'cannot send blah blah' message
  if (req.method === 'HEAD') {
    res.write = (function (o) {
      return function (c) { return o.call(res, '') }
    })(res.write)
    res.end = (function (o) {
      return function (c) { return o.call(res) }
    })(res.end)
  }

  // allow stuff like "req.pathname", etc.
  var u = url.parse(req.url)
  delete u.auth
  Object.keys(u, true).forEach(function (k) {
    req[k] = u[k]
  })

  res.error = function (er) {
    errors(er, req, res)
  }

  res.redirect = function (target, code) {
    res.statusCode = code || 302
    res.setHeader('location', target)
    var avail = ['text/html', 'application/json']
    var mt = req.neg.preferredMediaType(avail)
    if (mt === 'application/json') {
      res.sendJSON({ redirect: target, statusCode: code })
    } else {
      res.sendHTML('<html><body><h1>Moved'
                  + (code === 302 ? ' Permanently' : '') + '</h1>'
                  +'<a href="' + target + '">' + target + '</a>')
    }
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
  if (req.listeners('json').length) {
    if (!req.headers['content-type'].match(/\/(x-)?json$/)) {
      return res.error(415)
    }
    req.on('body', function (b) {
      try {
        var j = JSON.parse(b)
      } catch (e) {
        e.statusCode = 400
        return res.error(e)
      }
      req.emit('json', j)
    })
  }

  if (req.listeners('form').length) {
    // XXX Add support for formidable uploading, as well
    if (req.headers['content-type'] !==
        'application/x-www-form-urlencoded') {
      return res.error(415)
    }
    req.on('body', function (data) {
      req.emit('form', qs.parse(data))
    })
  }

  if (req.listeners('body').length) {
    var maxLen = req.maxLen
    if (maxLen) {
      var cl = req.headers['content-length']
      res.setHeader('max-length', ''+maxLen)
      if (!cl) return res.error(411) // length required.
      if (cl > maxLen) return res.error(413) // too long.
    }

    var b = ''
    , d = new StringDecoder
    req.on('data', function (c) {
      b += d.write(c)
    })
    req.on('end', function () {
      req.emit('body', b)
    })
  }

}

