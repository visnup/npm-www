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
, qs = require("querystring")
, crypto = require("crypto")
, keygrip = require("keygrip")()
, Cookies = require("cookies")
, EventEmitter = require("events").EventEmitter


// middleware that adds cookie support
var cookieMiddle = new EventEmitter()
cookieMiddle.on("request", function (req, res) {
  console.error("Cookies middleware")
  req.cookies = res.cookies = new Cookies(req, res, keygrip)
})
app.middle(cookieMiddle)


// middleware that adds session token
var sessionToken = new EventEmitter()
, sessionKey = config.sessionKey || "npm-www-session"
sessionToken.on("request", function (req, res) {
  console.error("session token middleware")
  if (!req.cookies) {
    throw new Error("session token requires cookies")
  }
  var key = req.cookies.get(sessionKey, {signed: true})
  if (!key) {
    key = crypto.randomBytes(30).toString("base64")
    req.cookies.set(sessionKey, key, {signed: true})
  }
  console.error("set session to ", key)
  req.session = res.session = key
})
app.middle(sessionToken)



// XXX replace with real session backing
var superShittyMemorySessionStore = {}

app.auth(function (req, res, cb) {
  console.error("session id = "+req.session)
  console.error("session store =", superShittyMemorySessionStore)

  var user
  if (req.session && superShittyMemorySessionStore[req.session]) {
    // valid session!
    user = superShittyMemorySessionStore[req.session]
  }
  cb(user)
})


npm.load({ "cache-min": "60000", "node-version": null }, function (er) {
  if (er) throw er

  app.httpServer.listen(config.port)
  console.log("Listening on %d", config.port)
})

app.route("/-/static/*").files(path.resolve(__dirname, "static"))
app.route("/favicon.ico").file(path.resolve(__dirname, "favicon.ico"))

app.route("/-").html(function (req, res) {
  res.notfound()
  //app.notfound(res)
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
