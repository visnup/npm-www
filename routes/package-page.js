module.exports = packagePage

var LRU = require("lru-cache")
, regData = new LRU(10000)
, marked = require("marked")
, callresp = require("cluster-callresp")
, template = null

function packagePage (req, res) {
  var name = req.params.name
  , version = req.params.version

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
  res.sendHTML(template({ package: data, marked: marked }))
}

fs.readFile('./templates/package-page.ejs', function(err, data) {
  if (err) return console.log(err)

  template = require('ejs').compile(data.toString())
})
