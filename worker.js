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
, loneServer
, RedSess = require('redsess')
, bunyan = require('bunyan')
, npm = require('npm')
, fs = require('fs')
, gitHead

try {
  gitHead = fs.readFileSync('.git/HEAD', 'utf8').trim()
  if (gitHead.match(/^ref: /)) {
    gitHead = gitHead.replace(/^ref: /, '').trim()
    gitHead = fs.readFileSync('.git/' + gitHead, 'utf8').trim()
  }
} catch (_) {
  gitHead = '(not a git repo) ' + _.message
}

var h = config.host
if (!h) throw new Error('Must set a host in config file')
if (config.https) h = 'https://' + h

var lonePort = 10000 + (cluster.worker.id % 100)
var lh = h + ':' + lonePort
if (config.port && config.port !== 443) h += ':' + config.port

var canon = config.canon = require('canonical-host')(h, lh, 301)

config.stamp = 'pid=' + process.pid + ' ' +
               'worker=' + cluster.worker.id + ' ' + gitHead + ' ' + lh

config.log.worker = cluster.worker.id
config.log.pid = process.pid
var logger = bunyan.createLogger(config.log)

console.error = logger.warn.bind(logger)
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
  // automatically re-login the adminCouch when it expires.
  config.adminCouch.tokenGet = function (cb) {
    config.adminCouch.login(auth, function (er, cr, data) {
      cb(er, this.token)
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

  // also listen on a port that is unique to this worker, for debugging.
  loneServer = https.createServer(config.https, site)

  if (config.httpPort) {
    // redirect to the appropriate
    httpServer = http.createServer(function (req, res) {
      if (canon(req, res)) return
      // wtf?
      res.statusCode = 400
      res.end('bad')
    })
    httpServer.listen(config.httpPort)
  }
} else {
  server = http.createServer(site)
  loneServer = http.createServer(site)
}

var npmconf = config.npm || {}
npmconf["node-version"] = null
npm.load(npmconf, function (er) {
  logger.warn('back from npm load, about to start listening')
  if (er) throw er

  server.listen(config.port, function () {
    logger.warn("Listening on %d", config.port)
  })

  loneServer.listen(lonePort, function () {
    logger.warn("Listening on %d", lonePort)
  })
})

var didCloseMsg = 0
function closeAll () {
  logger.warn('Worker closing %d', didCloseMsg++)
  ;[server, httpServer, loneServer, RedSess ].forEach(function (s, i) {
    if (s.CLOSED) return
    s.CLOSED = true

    try { s.close() } catch (e) {
      logger.error('error closing server %d', i, e)
    }
  })

  try { config.redis.client.quit() } catch (e) {
    logger.error('error quitting redis client', e)
  }
}

loneServer.on('close', closeAll)
server.on('close', closeAll)
httpServer && httpServer.on('close', closeAll)
