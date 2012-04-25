// XXX Get npm data from the master module.

var cluster = require("cluster")
, config = require("./config.js")

if (cluster.isMaster) {
  // just spin up one worker for dev stuff
  config.cluster.size = 1
  require("./server.js")
  return
}


var callresp = require("cluster-callresp")

// the http server

var request = require("request")
, fs = require("fs")
, path = require("path")
, config = require("./config.js")
, npm = require("npm")
, url = require("url")
, marked = require("marked")
, glob = require("glob")
, qs = require("querystring")
, crypto = require("crypto")
, Keygrip = require("keygrip")
, Cookies = require("cookies")
, redis = require("redis")
, http = require("http")
, https = require("https")
, site = require("./site.js")
, LRU = require("lru-cache")
, regData = new LRU(10000)

if (config.https) {
  https.createServer(config.https, site).listen(config.port)
  console.log("SSL Listening on %d", config.port)
} else {
  http.createServer(site).listen(config.port)
  console.log("Listening on %d", config.port)
}

return


/// that's it.  the rest down here is just older stuff

app.route("/-/static/*").files(path.resolve(__dirname, "static"))
app.route("/favicon.ico").file(path.resolve(__dirname, "favicon.ico"))

app.route("/-").html(function (req, res) {
  res.notfound()
})

app.route("/-/login", function (req, res) {
  // Do sessions
  switch (req.method) {
    case "POST":
      req.on("body", function (data) {
        data = qs.parse(data)
        // now make sure that the data is actually valid
        // check it against the couchdb, and then put into the session
        //
        // XXX Replace with a config
        var couch = "https://isaacs.iriscouch.net/"
        , uri = couch + "_users/org.couchdb.user:" + data.user
        , auth = new Buffer(data.user + ":" + data.pass).toString("base64")
        , ropts = { uri: uri
                  , json: true
                  , headers: { authorization: "Basic " + auth }}
        request.get(ropts, function (er, resp, user) {
          if (er) return res.error(er)

          if (user.error) {
            // XXX redirect back to the GET case, but with a message
            user.statusCode = 403
            return res.error(user)
          }

          superShittyMemorySessionStore[req.session] = req.user = user
          res.end("<html>you logged in!\n" + JSON.stringify(user))
        })
      })
      break

    case "GET":
      if (req.user) {
        res.end("<html>logged in already\n"+JSON.stringify(req.user, null, 2))
      } else {
        res.end("<html>login, please: " +
                "<form method='post'><label>u: <input name='user'></label>" +
                "<label>p: <input type='password' name='pass'></label>" +
                "<input type='submit'></form>")
      }
      break
  }
})


// XXX 'done' param, defaulting to referer if provided
app.route("/-/logout").methods("GET").html(function (req, res) {
  if (req.session) {
    delete superShittyMemorySessionStore[req.session]
  }

  res.statusCode = 302
  res.setHeader('location', '/')
  res.end('<a href=/>logged out</a>')
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

  callresp({ cmd: 'registry.get'
           , name: name
           , version: version }, function (er, data) {
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
