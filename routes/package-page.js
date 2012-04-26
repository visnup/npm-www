module.exports = packagePage

var LRU = require("lru-cache")
, regData = new LRU(10000)
, marked = require("marked")
, callresp = require("cluster-callresp")
, crypto = require("crypto")
, template = null
, helpers = {
    marked: marked
  , gravatar: gravatar
}
, fs = require('fs')

function packagePage (req, res) {
  var name = req.params.name
  , version = req.params.version || 'latest'

  var k = name + '/' + (version || '')
  , data = regData.get(k)

  if (data) return render(data, req, res)

  // go get the package.
  callresp({ cmd: 'registry.get'
           , name: name
           , version: version }, function (er, data) {
    if (er) return res.error(er)

    regData.set(k, data)

    return render(data, req, res)
  })
}

function render (data, req, res) {
  var locals = { package: data }
  Object.keys(helpers).forEach(function (i) { locals[i] = helpers[i] })

  res.sendHTML(template(locals))
}

function gravatar (email, size) {
  var md5sum = crypto.createHash('md5')
  , hash = md5sum.update(email.trim().toLowerCase()).digest('hex')
  size = size || '50'
  return 'https://secure.gravatar.com/avatar/' + hash + '?s=' + size
}
