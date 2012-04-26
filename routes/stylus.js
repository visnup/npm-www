module.exports = styl

var stylus = require("stylus")
, nib = require("nib")
, fs = require("fs")
, cache = {}
, crypto = require('crypto')
, glob = require('glob')
, zlib = require('zlib')

// just load them all up at startup
// should probably do something this for /static as well.
glob.sync('stylus/**/*.styl').forEach(function (s) {
  fs.readFile(s, function (er, raw) {
    if (er) throw er
    render(s, raw, function (er, css) {
      if (er) throw er
    })
  })
})

function render (s, raw, cb) {
  if (cache[s]) return cb()
  var etag = getETag(raw)
  stylus(raw.toString())
    .use(nib())
    .render(function (er, css) {
      if (cache[s]) return cb()
      if (er) return cb(er)
      css = new Buffer(css)
      zlib.gzip(css, function (er, z) {
        cache[s] = [etag, css, z]
        cb()
      })
    })
}

function send (req, res, cache) {
  var etag = cache[0]
  , css = cache[1]
  , z = cache[2]

  if (req.headers['if-none-match'] === etag) {
    res.statusCode = 304
    return res.end()
  }

  var enc = req.negotiator.preferredEncoding('gzip', 'identity')
  res.setHeader('content-type', 'text/css')
  res.setHeader('etag', etag)
  if (enc === 'gzip') {
    res.setHeader('content-encoding', 'gzip')
    res.end(z)
  } else {
    res.end(css)
  }
}

function styl (req, res) {
  var f = 'stylus/' + req.splats.join('/')
  f = f.replace(/\.css/, '.styl')

  if (cache[f]) return send(req, res, cache[f])

  fs.readFile(f, function (er, raw) {
    if (er) return res.error(404)
    render(f, raw, function (er, css) {
      send(req, res, cache[f])
    })
  })
}

function getETag (str) {
  var h = crypto.createHash("sha1")
  h.update(str)
  return '"' + h.digest('base64') + '"'
}
