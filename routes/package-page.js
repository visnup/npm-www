module.exports = packagePage

var LRU = require("lru-cache")
, regData = new LRU(10000)
, marked = require("marked")
, callresp = require("cluster-callresp")

function packagePage (req, res) {
  var name = req.params.name
  , version = req.params.version

  var k = name + '/' + (version || '')
  , data = regData.get(k)

  if (data) return showReadme(data, req, res)

  // go get the package.
  callresp({ cmd: 'registry.get'
           , name: name
           , version: version }, function (er, data) {
    if (er) return res.error(er)

    regData.set(k, data)

    return showReadme(data, req, res)
  })
}

function showReadme (data, req, res) {
  if (data.readme) {
    return res.sendHTML(marked.parse(data.readme))
  }

  res.sendJSON(data)
}
