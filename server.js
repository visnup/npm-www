// XXX Use the npm-data worker in a forked module instead.
var tako = require("tako")
, request = require("request")
, app = tako()
, fs = require("fs")
, path = require("path")
, config = require("./config.js")
, npm = require("npm")
, url = require("url")
, marked = require("marked")
, glob = require("glob")
, filed = require("filed")
, registry = require("npm/lib/utils/npm-registry-client/index.js")
, LRU = require("lru-cache")
, regData = new LRU(10000)

npm.load({ "cache-min": "60000", "node-version": null }, function (er) {
  if (er) throw er

  app.httpServer.listen(config.port)
  console.log("Listening on %d", config.port)
})

app.route("/static/*").files(path.resolve(__dirname, "static"))
app.route("/favicon.ico").file(path.resolve(__dirname, "favicon.ico"))

app.route("/-").html(function (req, res) {
  res.notfound()
  //app.notfound(res)
})

app.route("/-/login").html(function (req, res) {
  // initialize login
  switch (req.method) {
    case "POST":
      req.on("body", function (data) {
        res.end("you logged in!")
      })
      break
    case "GET":
      res.end("login, please: " +
              "<form method='post'><label>u: <input name='user'></label>" +
              "<label>p: <input type='password' name='pass'></label>" +
              "<input type='submit'></form>")
      break
  }
})


app.route("/*").html(function (req, res) {
  // The default project page.
  console.log(url.parse(req.url).pathname)
  var p = url.parse(req.url).pathname.replace(/\/\/+/g, "/").split("/").slice(1)
  , name = p.shift()
  , version = p.shift()

  console.log("name=%s", name)
  var k = name + "/" + version
  , data = regData.get(k)

  if (data) return showReadme(data, req, res)

  registry.get(name, version, 60000, false, true, function (er, data) {
    if (er) return res.error(er)

    regData.set(k, data)

    return showReadme(data, req, res)
  })
})

function showReadme (data, req, res) {
  if (data.readme) {
    return res.end(marked.parse(data.readme))
  }

  res.setHeader("content-type", "application/json")
  res.end(JSON.stringify(data))
}
