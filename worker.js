// the http server.
// Runs in the cluster worker processes.
//
// This is the only module that should create any
// long-lived things that might keep the event loop
// open indefinitely.  When the server closes, they
// should all be closed so that we can do a normal
// exit.

var cluster = require("cluster")
if (cluster.isMaster) {
  throw new Error("should only be invoked as cluster worker")
}

var config = require("./config.js")
, http = require("http")
, https = require("https")
, site = require("./site.js")
, server
, RedSess = require('redsess')
, bunyan = require('bunyan')
, npm = require('npm')

config.log.worker = cluster.worker.uniqueID
config.log.pid = process.pid
var logger = bunyan.createLogger(config.log)

console.error = logger.info.bind(logger)
console.log = logger.info.bind(logger)

// if there's an admin couchdb user, then set that up now.
if (config.couchAuth) {
  var ca = config.couchAuth.split(':')
  , name = ca.shift()
  , password = ca.join(':')
  , auth = { name: name, password: password }
  , CouchLogin = require('couch-login')

  config.adminCouch = new CouchLogin(config.registryCouch)
  config.adminCouch.login(auth, function (er, cr, data) {
    if (er) throw er
  })
  config.adminCouch.getToken = function (cb) {
    config.adminCouch.login(auth, function () {
      if (er) throw er
      cb(this.token)
    })
  }
}

RedSess.createClient(config.redis)

// a general purpose redis thing.
// Note: for sessions, use req.session, not this!
var r = config.redis
, redis = require('redis')
config.redis.client = redis.createClient(r.port, r.host, r)
if (r.auth) config.redis.client.auth(r.auth)

var httpServer = null
if (config.https) {
  server = https.createServer(config.https, site)
  if (config.httpPort) {
    var url = require('url')
    // redirect to the appropriate
    httpServer = http.createServer(function (req, res) {
      if (!req.headers.host) {
        res.writeHead(400)
        return res.end('No host header.')
      }
      var u = url.parse('https://' + req.headers.host + req.url)
      delete u.host
      u.port = (config.port === 443) ? null : config.port
      u = url.format(u)
      res.writeHead(301, { location: u })
      res.end('moved: ' + u)
    })
    httpServer.listen(config.httpPort)
  }
} else {
  server = http.createServer(site)
}

var npmconf = config.npm || {}
npmconf["node-version"] = null
npm.load(npmconf, function (er) {
  if (er) throw er
  server.listen(config.port, function () {
    logger.info("Listening on %d", config.port)
  })
})

server.on('close', function () {
  // usually the cluster disconnect will close this one, too.
  try { httpServer.close() } catch (e) {}
  RedSess.close()
  config.redis.client.quit()
  logger.info('Worker closing')
})
