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
