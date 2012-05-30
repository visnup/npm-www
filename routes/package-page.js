module.exports = packagePage

var LRU = require("lru-cache")
, regData = new LRU(10000)
, marked = require("marked")
, callresp = require("cluster-callresp")
, crypto = require("crypto")
, helpers = {
    marked: marked
  , gravatar: gravatar
}
, fs = require('fs')

function packagePage (req, res) {
  var name = req.params.name
  , version = req.params.version || 'latest'

  // get the user's profile.
  if (req.profile) next()
  else req.session.get('profile', function (er, data) {
    if (er) return res.error(er)
    req.profile = data
    next()
  })

  // get the package data.
  var k = name + '/' + (version || '')
  , pkgData = regData.get(k)

  if (pkgData) next()
  else callresp({ cmd: 'registry.get'
           , name: name
           , version: version }, function (er, data) {
    if (er) return res.error(er)

    regData.set(k, data)
    pkgData = data

    return next()
  })

  function next () {
    if (!pkgData) return
    if (!req.hasOwnProperty('profile')) return
    render(pkgData, req, res)
  }
}

function render (data, req, res) {
  var locals = { package: data, profile: req.profile }
  // readme should not contain raw html
  if (data.readme) {
    data.readme = data.readme.replace(/</g, '&lt;')
  }

  Object.keys(helpers).forEach(function (i) {
    locals[i] = helpers[i]
  })

  res.template("package-page.ejs", locals)
}

function gravatar (email, size) {
  var md5sum = crypto.createHash('md5')
  , hash = md5sum.update((email || '').trim().toLowerCase()).digest('hex')
  size = size || '50'
  return 'https://secure.gravatar.com/avatar/' + hash + '?s=' + size
}
