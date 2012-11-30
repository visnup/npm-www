module.exports = authors

var qs = require('querystring')
var AC = require('async-cache')
var npm = require('npm')
var maxAge = 1000 * 60 * 60 * 24 * 365
var day = 1000 * 60 * 60 * 24

var cache = new AC({
  max: 1000,
  length: function (n) { return n.length },
  maxAge: 1000 * 60,
  load: function (key, cb) {
    key = JSON.parse(key)
    var age = +key[0]
    var skip = key[1]
    var limit = key[2]
    var u = '/-/_view/browseAuthorsRecent?'
    var query = {}
    if (age > maxAge || !age || age <= 0)
      return cb(new Error('invalid "age" param '+age))

    query.group_level = 2
    var start = new Date(Date.now() - age - day)
    var startkey = [start.toISOString().substr(0, 10)]
    query.startkey = JSON.stringify(startkey)
    u += qs.stringify(query)
    npm.registry.get(u, function (er, data, res) {
      if (!er && !data.rows) {
        var er = new Error('no data returned')
        er.code = er.status = 404
      }
      if (er)
        return cb(er)

      // group count by author name
      var res = {}
      data.rows = data.rows.map(function (row) {
        row.key.shift()
        return row
      }).reduce(function (set, row) {
        if (res[row.key[0]])
          res[row.key[0]].value += row.value
        else {
          set.push(row)
          res[row.key[0]] = row
        }
        return set
      }, []).map(function (row) {
        return {
          name: row.key[0],
          description: row.value + ' packages',
          url: '/profile/' + row.key[0],
          value: row.value
        }
      }).sort(function (a, b) {
        return b.value - a.value
      }).slice(skip, skip + limit)

      cb(null, data.rows)
    })
  }
})

function authors (age, skip, limit, cb) {
  skip = skip || 0
  limit = limit || 100
  var key = JSON.stringify([age, skip, limit])
  return cache.get(key, cb)
}
