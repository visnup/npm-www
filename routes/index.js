module.exports = indexPage

var lastUpdated
var interval = 1000
var cache = {}
var browse = require('../models/browse.js')
var recentauthors = require('../models/recentauthors.js')
var commaIt = require('comma-it').commaIt
var didStartup = false
var loading = false
function load (startup) {
  if (loading) return
  loading = true

  var n = 4
  browse('star', null, 0, 10, next('starred'))

  // last two weeks
  recentauthors(1000*60*60*24*14, 0, 10, next('authors'))
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

  req.model.load('root')
  // Show download count for the last week and month.
  // since the current day might not be done loading, back up an extra
  // day as well.
  // TODO: Detailed analytics, maybe with some nice client-side chart
  var month = Date.now() - 1000 * 60 * 60 * 24 * 31
  var week = Date.now() - 1000 * 60 * 60 * 24 * 8
  var end = Date.now() - 1000 * 60 * 60 * 24
  req.model.loadAs('downloads', 'dlDay', end, end, name, false)
  req.model.loadAs('downloads', 'dlWeek', week, end, name, false)
  req.model.loadAs('downloads', 'dlMonth', month, end, name, false)

  req.model.load('profile', req)

  req.model.end(function (er, m) {
    var root = m.root || {}
    var dc = root.doc_count || 3
    var dcWComma = commaIt(dc -  3) //Design docs
    var locals = {
      profile: m.profile,
      title: 'npm',
      updated: cache.updated || [],
      authors: cache.authors || [],
      starred: cache.starred || [],
      depended: cache.depended || [],
      dlDay: commaIt(m.dlDay),
      dlMonth: commaIt(m.dlMonth),
      dlWeek: commaIt(m.dlWeek),
      totalPackages: dcWComma
    }
    res.template("index.ejs", locals)
  })
}
