// this is basically just here to count form submissions,
// but conceivably it could be used for other things as well.

module.exports = search

// behave like as if the user had done
// <form method=get action="https://encrypted.google.com/search">
// <input name=q type=hidden value='site:npmjs.org'>

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

function search (req, res) {
  var u = req.url && req.url.split('?')[1]
  if (!u) return res.error(404)
  var qs = querystring.parse(u)
  if (!qs.q) return res.error(404)
  var target = 'https://encrypted.google.com/search?q=' +
               qs.q + '&q=site:npmjs.org&hl=en'
  searches.push(qs.q)
  res.redirect(target, '302')
  update()
}
