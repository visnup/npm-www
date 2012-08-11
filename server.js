var config = require('./config.js')
, worker = require.resolve('./worker.js')
, cluster = require('cluster')
, clusterConf = config.cluster || {}
clusterConf.exec = worker

process.stdout.on('error', function (er) {
  if (er.code === 'EPIPE') return
  throw er
})

// set up the server cluster.
var clusterMaster = require("cluster-master")
, npm = require("npm")

config.log.master = true
var logger = require('bunyan').createLogger(config.log)

console.error = logger.warn.bind(logger)
console.log = logger.info.bind(logger)

var npmconf = config.npm || {}
npmconf["node-version"] = null
npm.load(npmconf, function (er) {
  if (er) throw er

  // Ok, we're ready!  Spin up the cluster.
  clusterMaster(clusterConf)
})

// if there's an http port, then redirect from there to https.
// this almost never needs to change, so just run it in the master,
// rather than having each worker to it.
if (config.https && config.httpPort) {
  var h = 'https://' + config.host
  if (config.port && config.port !== 443) h += ':' + config.port
  var canon = config.canon = require('canonical-host')(h, 301)
  var http = require('http')
  httpServer = http.createServer(function (req, res) {
    if (canon(req, res)) return
    // wtf?
    res.statusCode = 400
    res.end('bad')
  })
  httpServer.listen(config.httpPort)
  // restart on crashes
  httpServer.on('close', function () {
    console.error('http->https redirector crashed')
    setTimeout(function () {
      httpServer.listen(config.httpPort)
    }, 100)
  })
}
