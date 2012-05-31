module.exports = packagePage

var LRU = require("lru-cache")
, regData = new LRU(10000)
, marked = require("marked")
, callresp = require("cluster-callresp")
, crypto = require("crypto")
, fs = require('fs')


function packagePage (req, res) {
  var name = req.params.name
  , version = req.params.version || 'latest'

  req.model.load('myprofile', req)
  req.model.load('package', req.params)
  req.model.end(function (er, m) {
    if (er) return res.error(er)
    if (!m.package) return res.error(404)
    var locals = { package: m.package, profile: m.myprofile }
    res.template("package-page.ejs", locals)
  })
}
