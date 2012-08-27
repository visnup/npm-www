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
else h = 'http://' + h

var lonePort = 10000 + (cluster.worker.id % 100)
var lh = h + ':' + lonePort
if (config.port && config.port !== 443) h += ':' + config.port

config.canonicalHost = h

var canon = config.canon = require('canonical-host')(h, lh, 301)

config.stamp = 'pid=' + process.pid + ' ' +
               'worker=' + cluster.worker.id + ' ' + gitHead + ' ' + lh

config.log.worker = cluster.worker.id
config.log.pid = process.pid
var logger = bunyan.createLogger(config.log)

console.error = logger.warn.bind(logger)
console.log = logger.info.bind(logger)

// if there's an admin couchdb user, then set that up now.
var CouchLogin = require('couch-login')
if (config.couchAuth) {
  var ca = config.couchAuth.split(':')
  , name = ca.shift()
  , password = ca.join(':')
  , auth = { name: name, password: password }

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
config.anonCouch = new CouchLogin(config.registryCouch, NaN)

RedSess.createClient(config.redis)

// a general purpose redis thing.
// Note: for sessions, use req.session, not this!
var r = config.redis
, redis = require('redis')
config.redis.client = redis.createClient(r.port, r.host, r)
if (r.auth) config.redis.client.auth(r.auth)

if (config.https) {
  server = https.createServer(config.https, site)
  loneServer = https.createServer(config.https, site)
} else {
  server = http.createServer(site)
  loneServer = http.createServer(site)
}

var npmconf = config.npm || {}
npmconf["node-version"] = null
npm.load(npmconf, function (er) {
  if (er) throw er

  server.listen(config.port, function () {
    logger.info("Listening on %d", config.port)

    // https://github.com/joyent/node/issues/3856
    cluster.isWorker = false
    cluster.isMaster = true
    loneServer.listen(lonePort, function () {
      cluster.isMaster = false
      cluster.isWorker = true
      logger.info("Listening on %d", lonePort)
    })
  })
})

function closeAll () {
  logger.warn('Worker closing')

  // at this point, we don't care about errors.  we're quitting anyway.
  process.on('uncaughtException', function (e) {
    console.error('shutdown error', e)
  })

  if (this === loneServer) {
    server.removeListener('close', closeAll)
    server.close()
  } else if (this === server) {
    loneServer.removeListener('close', closeAll)
    loneServer.close()
  }
  RedSess.close()

  try { config.redis.client.quit() } catch (e) {
    logger.error('error quitting redis client', e)
  }

  // race condition.  it's possible that we're closing because the
  // master did worker.disconnect(), in which case the IPC channel
  // will be in the process of closing right now.  give it a tick
  // to accomplish that.
  var t = setTimeout(function () {
    if (process.connected) process.disconnect()
  }, 100)
  process.on('disconnect', function () {
    clearTimeout(t)
  })
}

loneServer.on('close', closeAll)
server.on('close', closeAll)
