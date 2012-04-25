// XXX Maybe split route handlers into separate modules?
// Could do some kind of fs.readdir and then require them all.

var routes = require("routes")
, Router = routes.Router
, Route = routes.Route
, filed = require("filed")
, router = new Router()
, path = require('path')
, callresp = require("cluster-callresp")
, errors = require("./errors.js")

module.exports = router

// static stuff serves out of the static folder.
router.addRoute("/-/static/*", function (req, res) {
  var f = path.join("/", req.splats.join('/'))
  var d = path.join(__dirname, 'static', f)
  filed(d).pipe(res)
})

router.addRoute("/favicon.ico", function (req, res) {
  filed("favicon.ico").pipe(res)
})

router.addRoute("/-/*", errors(404))
router.addRoute("/-", errors(404))



// The package details page
var LRU = require("lru-cache")
, regData = new LRU(10000)
, marked = require("marked")

router.addRoute("/:name/:version", packagePage)
router.addRoute("/:name", packagePage)
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
