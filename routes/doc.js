// XXX Abstract this out into a separate module.
// It's almost identical to routes/styl.js and routes/static.js

module.exports = static

var path = require("path")
, cache = {}
, crypto = require('crypto')
, glob = require('glob')
, zlib = require('zlib')
, mimetypes = require('filed/mimetypes.js')
, fs = require('fs')
, url = require('url')

var loading = false
, lastLoaded = Date.now()
, interval = 1000 * 60 // 1 minute

load(true)

function load (startup) {
  if (loading) return
  lastLoaded = Date.now()

  glob.sync('{doc,api}/**/*.*').forEach(function (s) {
    fs.readFile(s, function (er, raw) {
      if (er && startup) throw er
      if (er) return

      if (cache[s] && getETag(raw) === cache[s][0]) return
      delete cache[s]
      render(s, raw, function (er) {
        if (er && startup) throw er
      })
    })
  })
}

function render (s, raw, cb) {
  if (cache[s]) return cb()
  var etag = getETag(raw)
  zlib.gzip(raw, function (er, z) {
    var ext = path.extname(s).substr(1)
    , type = mimetypes.lookup(ext)

    cache[s] = [etag, raw, z, type]
    cb()
  })
}

function send (req, res, cache) {
  var etag = cache[0]
  , raw = cache[1]
  , z = cache[2]
  , type = cache[3]

  if (req.headers['if-none-match'] === etag) {
    res.statusCode = 304
    return res.end()
  }

  var enc = req.negotiator.preferredEncoding('gzip', 'identity')
  res.setHeader('content-type', type)
  res.setHeader('etag', etag)
  if (enc === 'gzip') {
    res.setHeader('content-encoding', 'gzip')
    res.end(z)
  } else {
    res.end(raw)
  }
}


function static (req, res) {
  if (Date.now() - lastLoaded > interval) load()

  var p = url.parse(req.url).pathname
  var f = path.join('/', p)
  , d = path.join(__dirname, '..', f)
  , index = d.replace(/\/+$/, '').replace(/\/+/g, '/') + '/index.html'

  if (cache[d]) return send(req, res, cache[d])
  if (cache[index]) return send(req, res, cache[index])

  fs.readFile(d, function (er, raw) {
    if (er && er.code === 'EISDIR') {
      d = index
      return fs.readFile(d, arguments.callee)
    }

    if (er) return res.error(er, 404)
    render(d, raw, function (er) {
      send(req, res, cache[d])
    })
  })
}

function getETag (str) {
  var h = crypto.createHash("sha1")
  h.update(str)
  return '"' + h.digest('base64') + '"'
}
