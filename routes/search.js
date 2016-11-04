module.exports = search

var fs = require('fs')
var path = require('path')
var querystring = require('querystring')
var logFile = path.resolve(__dirname, '../search.log')
var searches = []
var minInterval = 1000 // no more than 1ce per second.
var lastUpdated
var updating

function update () {
  if (updating || searches.length === 0) return
  if (lastUpdated && Date.now() - lastUpdated < minInterval) return
  updating = true

  // log the search queries we've gotten so far.
  var write = searches.slice(0)
  var now = Date.now()
  var out = write.map(function (s) {
    return now + ' ' + s + '\n'
  }).join('')
  searches.length = 0

  fs.appendFile(logFile, out, 'utf8', function (er, c) {
    updating = false
    if (er) {
      searches = write.concat(searches)
      return
    }
    lastUpdated = now
  })
}

// TODO(isaacs): Show a fancy search page if no query, not a 404
function search (req, res) {
  var u = req.url && req.url.split('?')[1]
  if (!u) return res.error(404)
  var qs = querystring.parse(u)

  // Support /search?foo+bar as well as /search?q=foo+bar
  if (!qs.q) {
    u = 'q=' + u
    qs = querystring.parse(u)
  }

  req.model.load('search', qs)
  req.model.end(function(er, m) {
    if (er)
      res.error(er)
    else
      res.template('search.ejs', m.search)
  })

  searches.push(qs.q)
  update()
}
