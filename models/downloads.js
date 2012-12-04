// stupid download counters
// The download counts are like this:
//
// /download/_design/app/_view/pkg
// --> {key:["pkgname", "YYYY-MM-DD"],value:123}
// /download/_design/app/_view/day
// --> {key:["YYYY-MM-DD", "pkgname"],value:123}
//
// These only change daily.

module.exports = downloads

var AC = require('async-cache')
var cache = new AC({
  max: 1000,
  maxAge: 1000 * 60 * 60,
  load: load
})

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

  var k = JSON.stringify([start, end, pkg, detail])
  cache.get(k, cb)
}

function load (k, cb) {
  k = JSON.parse(k)
  var start = k[0]
  var end = k[1]
  var pkg = k[2]
  var detail = k[3]

  var view, startkey, endkey, grouplevel
  if (start) start = new Date(start).toISOString().split('T')[0]
  if (pkg) {
    view = 'pkg'
    startkey = [pkg, day(start)]
    endkey = [pkg, day(end) || {}]
  } else {
    view = 'day'
    startkey = [day(start)]
    endkey = [day(end) || {}, {}]
  }
  grouplevel = detail ? 2 : 1
  var u = '/downloads/_design/app/_view/' + view
  var q = qs.stringify({
    startkey: JSON.stringify(startkey),
    endkey: JSON.stringify(endkey),
    group_level: grouplevel
  })

  config.adminCouch.get(u + '?' + q, function (er, cr, data) {
    // downloads aren't really that important.
    // just lie and pretend we didn't see anything.
    if (er || !data) {
      data = { rows: [] }
      er = null
    }

    if (detail)
      data = data.rows.reduce(function (set, row) {
        var k = row.key
        var h = k[0]
        var t = k[1]
        set[h] = set[h] || {}
        set[h][t] = row.value
        return set
      }, {})
    else if (pkg)
      data = (data.rows || []).reduce(function (set, row) {
        var h = row.key[0]
        set[h] = row.value
        return set
      }, {})
    else
      data = (data.rows || []).map(function (r) {
        return r.value
      }).reduce(function (a, b) {
        return a + b
      }, 0)

    if (pkg)
      data = data[pkg]

    if (data === undefined)
      data = 0

    return cb(er, data)
  })
}
