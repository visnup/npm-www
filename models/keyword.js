// return a list of all the packages that match a particular keyword

module.exports = keyword

var querystring = require("querystring")
, LRU = require('lru-cache')
, cache = new LRU(10000, function (c) { return c.length })
, timeout = 5 * 60 * 1000

function keyword (kw, couch, cb) {
  var cached = cache.get(kw)
  , stale = Date.now() - timeout
  if (cached && cached.time > stale) {
    return process.nextTick(cb.bind(this, null, cached))
  }
  if (cached) cache.del(kw)

  var sk = JSON.stringify([kw])
  , ek = JSON.stringify([kw, {}])
  , query = { startkey: sk, endkey: ek, group_level: 2 }
  , qs = querystring.encode(query)
  , u = '/registry/_design/app/_view/byKeyword?' + qs

  couch.get(u, function (er, cr, data) {
    if (er || data.error) {
      return cb(er || new Error(data.error))
    }

    data = data.rows.map(function (row) {
      return row.key[1]
    })
    data.time = Date.now()
    cache.set(kw, data)

    cb(null, data)
  })
}
