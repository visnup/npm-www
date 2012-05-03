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

config.log.worker = cluster.worker.uniqueID
var logger = bunyan.createLogger(config.log)

RedSess.createClient(config.redis)

if (config.https) {
  server = https.createServer(config.https, site)
} else {
  server = http.createServer(site)
}

server.listen(config.port, function () {
  logger.info("Listening on %d", config.port)
})

server.on('close', function () {
  RedSess.close()
  logger.info('Worker closing')
})
