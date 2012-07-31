module.exports = indexPage

var lastUpdated
var interval = 1000
var cache = {}
var browse = require('../models/browse.js')
var didStartup = false
var loading = false
function load (startup) {
  if (loading) return
  loading = true

  var n = 4
  browse('star', null, 0, 10, next('starred'))
  browse('author', null, 0, 10, next('authors'))
  browse('depended', null, 0, 10, next('depended'))
  browse('updated', null, 0, 10, next('updated'))

  function next (which) { return function (er, data) {
    if (startup && er) throw er
    cache[which] = data
    if (--n === 0) {
      loading = false
      lastUpdated = Date.now()
    }
  }}
}

setTimeout(function () {
  require('npm').load(function() {
    load(true)
  })
}, 100)

function indexPage (req, res) {
  // hasn't ever been loaded, just hold of a tick.
  if (!lastUpdated) return setTimeout(function() {
    indexPage(req, res)
  }, 100)

  var name = req.params.name
  , version = req.params.version || 'latest'

  if (!loading && (Date.now() - lastUpdated > interval)) load()

  req.model.load('profile', req)

  req.model.end(function (er, m) {
    var locals = {
      profile: m.profile,
      title: 'npm',
      updated: cache.updated || [],
      authors: cache.authors || [],
      starred: cache.starred || [],
      depended: cache.depended || []
    }
    res.template("index.ejs", locals)
  })
}
