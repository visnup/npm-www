// stupid download counters
// The download counts are like this:
//
// /download/_design/app/_view/pkg
// --> {key:["pkgname", "YYYY-MM-DD"],value:123}
// /download/_design/app/_view/day
// --> {key:["YYYY-MM-DD", "pkgname"],value:123}
//
// These only change daily.

var LRU = require('lru-cache')
var maxAge = 1000 * 60 * 60
var cache = new LRU({
  max: 1000,
  maxAge: maxAge
})

module.exports = downloads
var config = require('../config.js')
var qs = require('querystring')

function day (s) {
  if (!(s instanceof Date)) {
    if (!Date.parse(s))
      return null
    s = new Date(s)
  }
  return s.toISOString().substr(0, 10)
}

function downloads (start, end, pkg, detail, cb) {
  if (typeof cb !== 'function')
    cb = detail, detail = false
  if (typeof cb !== 'function')
    cb = pkg, pkg = null
  if (typeof cb !== 'function')
    cb = end, end = null
  if (typeof cb !== 'function')
    cb = start, start = null

  var k = [start, end, pkg, detail].join('/')
  var cached = cache.get(k)
  if (cached)
    return process.nextTick(cb.bind(null, null, cached))

  var view, startkey, endkey, grouplevel
  if (start) start = new Date(start).toISOString().split('T')[0]
  if (pkg) {
    view = 'pkg'
    startkey = [pkg, day(start)]
    endkey = [pkg, day(end) || {}]
  } else {
    view = 'day'
    startkey = [day(start)]
    endkey = [day(start) || {}, {}]
  }
  grouplevel = detail ? 2 : 1
  var u = '/downloads/_design/app/_view/' + view
  var q = qs.stringify({
    startkey: JSON.stringify(startkey),
    endkey: JSON.stringify(endkey),
    group_level: grouplevel
  })
  config.anonCouch.get(u + '?' + q, function (er, cr, data) {
    if (er)
      return cb(er)
    if (detail)
      data = data.rows.reduce(function (set, row) {
        var k = row.key
        var h = k[0]
        var t = k[1]
        set[h] = set[h] || {}
        set[h][t] = row.value
        return set
      }, {})
    else
      data = data.rows.reduce(function (set, row) {
        var h = row.key[0]
        set[h] = row.value
        return set
      }, {})

    if (pkg)
      data = data[pkg]

    cache.set(k, data)
    return cb(er, data)
  })
}
