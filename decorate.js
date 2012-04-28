
module.exports = decorate

var errors = require("./errors.js")
, domain = require("domain")
, Cookies = require("cookies")
, Negotiator = require("negotiator")
, RedSess = require("redsess")

, path = require('path')
, Templar = require("templar")
, ejs = require('ejs')
, tplDir = path.resolve(__dirname, 'templates')
, templateOptions = { engine: ejs, folder: tplDir }
, url = require('url')

, CouchLogin = require('couch-login')

function decorate (req, res, config) {
  templateOptions.debug = config.debug

  // handle unexpected errors relating to this request.
  var d = domain.create()
  d.add(req)
  d.add(res)
  d.on("error", function (er) {
    try {
      res.error(er)
      // don't destroy before sending the error
      res.on("close", function () {
        d.dispose()
      })

      // don't wait forever, though.
      setTimeout(function () {
        d.dispose()
      }, 1000)

    } catch (er) {
      d.dispose()
    }
  })

  // set up various decorations
  // TODO: Move some/all of this into a separate module.

  req.cookies = res.cookies = new Cookies(req, res, config.keys)
  req.negotiator = new Negotiator(req)
  req.neg = req.negotiator
  req.session = res.session = new RedSess(req, res)

  // set up the CouchLogin to automatically save the token in the
  // session, and log in on demand.
  req.couch = CouchLogin(config.registryCouch).decorate(req, res)

  res.template = Templar(req, res, templateOptions)

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

  res.error = function (er, code) {
    if (code && typeof code === 'number') {
      if (er) er.statusCode = code
      else er = code
    }
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

  res.send = function (data, status, headers) {
    res.statusCode = res.statusCode || status
    if (headers) Object.keys(headers).forEach(function (h) {
      res.setHeader(h, headers[h])
    })
    if (!Buffer.isBuffer(data)) data = new Buffer(data)
    res.setHeader('content-length', data.length)
    res.end(data)
  }


  res.sendJSON = function (obj, status) {
    res.send(JSON.stringify(obj), status, {'content-type':'application/json'})
  }

  res.sendHTML = function (data, status) {
    res.send(data, status, {'content-type':'text/html'})
  }
}
