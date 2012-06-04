// XXX Abstract this out into a separate module.
// It's almost identical to routes/styl.js

module.exports = static

var path = require("path")
, cache = {}
, crypto = require('crypto')
, glob = require('glob')
, zlib = require('zlib')
, mimetypes = require('filed/mimetypes.js')
, fs = require('fs')

// just load them all up at startup
glob.sync('static/**/*.*').forEach(function (s) {
  fs.readFile(s, function (er, raw) {
    if (er) throw er
    render(s, raw, function (er) {
      if (er) throw er
    })
  })
})

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
  if (req.url === '/favicon.ico') {
    req.splats = ["", req.url]
  }

  // read from the 'static' folder.
  var f = path.join("/", req.splats.join('/'))
  , d = path.join(__dirname, '..', 'static', f)

  if (cache[d]) return send(req, res, cache[d])

  fs.readFile(d, function (er, raw) {
    if (er) return res.error(404)
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
