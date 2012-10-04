
module.exports = decorate

var ErrorPage = require("error-page")
, domain = require("domain")
, Cookies = require("cookies")
, RedSess = require("redsess")

, path = require('path')
, Templar = require("templar")
, ejs = require('ejs')
, tplDir = path.resolve(__dirname, 'templates')
, templateOptions = { engine: ejs, folder: tplDir }
, url = require('url')
, bunyan = require('bunyan')
, crypto = require('crypto')
, logger

, CouchLogin = require('couch-login')

// TODO: Error page configs
, errorPageConf = {}

, MC = require('./models.js')
, http = require('http')

function errorHandler (req, res, data) {
  if (!req.profile) {
    req.model.load('profile', req)
    req.model.end(thenShow)
  } else {
    thenShow()
  }

  function thenShow () {
    data.profile = req.profile
    data.title = data.message
    data.statusMessage = http.STATUS_CODES[data.statusCode]
    var tpl = 'error.ejs'
    var tplSpecial = 'error-' + data.statusCode + '.ejs'
    if (res.template.has(tplSpecial)) tpl = tplSpecial

    data.headers = Object.keys(data.headers || {}).filter(function (h) {
      return h !== 'cookie'
    }).reduce(function (set, h) {
      set[h] = data.headers[h]
      return set
    }, {})

    delete data.options

    res.template(tpl, data, data.statusCode || 500)
  }
}

var env = process.env.NODE_ENV
function decorate (req, res, config) {
  // production https can only be https ever.
  if (config.https && env === 'production') {
    res.setHeader('strict-transport-security',
                  1000 * 60 * 60 * 24 * 30 + '')
  }

  res.setHeader = function (orig) { return function () {
    if (res._header)
      return
    return orig.apply(this, arguments)
  }}(res.setHeader)


  req.model = res.model = new MC

  templateOptions.debug = config.debug
  templateOptions.stamp = config.stamp

  if (config.errorPage) errorPageConf = config.errorPage
  errorPageConf['*'] = errorHandler

  if (!logger) {
    var logOpts = config.log ||
      { name: 'npm-www', level: 'trace' }
    logger = bunyan.createLogger(logOpts)
  }

  // handle unexpected errors relating to this request.
  // TODO: make this a separate module.
  var d = domain.create()
  d.add(req)
  d.add(res)
  d.on("error", function (er) {
    logger.error({ error: er })
    try {
      if (res.error) res.error(er)
      else {
        res.statusCode = 500
        res.setHeader('content-type', 'text/plain')
        res.end('Server Error\n' + er.message)
      }

      // don't destroy before sending the error
      res.on("finish", function () {
        d.dispose()
      })

      // don't wait forever, though.
      setTimeout(function () {
        d.dispose()
      }, 1000)

      // disconnect after errors so that a fresh worker can come up.
      req.client.server.close()

    } catch (er) {
      d.dispose()
    }
  })

  // set up various decorations
  // TODO: Move some/all of this into a separate module.

  req.cookies = res.cookies = new Cookies(req, res, config.keys)
  req.session = res.session = new RedSess(req, res, {
    keys: config.keys,
    cookies: req.cookies
  })

  // set up the CouchLogin to automatically save the token in the
  // session, and log in on demand.
  req.couch = CouchLogin(config.registryCouch).decorate(req, res)
  req.couch.strictSSL = false

  res.template = Templar(req, res, templateOptions)
  res.template.locals.canonicalHref = url.resolve(
    config.canonicalHost, url.parse(req.url).path)

  req.log = res.log = logger.child(
    { serializers: bunyan.stdSerializers
    , req_id: crypto.randomBytes(4).toString('hex')
    , session: req.sessionToken })

  res.on('finish', function () {
    req.log.info({ res: res })
  })

  // more debugging info.
  var remoteAddr = req.socket.remoteAddress + ':'
                 + req.socket.remotePort
  , address = req.socket.address()
  address = address.address + ':' + address.port

  req.log.info({req: req, remote: remoteAddr, address: address})

  // allow stuff like "req.pathname", etc.
  var u = url.parse(req.url, true)
  delete u.auth
  Object.keys(u).forEach(function (k) {
    req[k] = u[k]
  })

  res.error = ErrorPage(req, res, errorPageConf)

  res.redirect = function (target, code) {
    res.statusCode = code || 302
    res.setHeader('location', target)
    var avail = ['text/html', 'application/json']
    res.html( '<html><body><h1>Moved'
            + (code === 302 ? ' Permanently' : '') + '</h1>'
            + '<a href="' + target + '">' + target + '</a>')
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


  res.json = res.sendJSON = function (obj, status) {
    res.send(JSON.stringify(obj), status, {'content-type':'application/json'})
  }

  res.html = res.sendHTML = function (data, status) {
    res.send(data, status, {'content-type':'text/html'})
  }
}
