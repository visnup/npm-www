var config = require("./config.js")
, worker = require.resolve("./worker.js")
, clusterConf = config.cluster || {}
clusterConf.exec = worker

// set up the server cluster.
var clusterMaster = require("cluster-master")
, npm = require("npm")
, LRU = require("lru-cache")
, regData = new LRU(10000)

config.log.master = true
var logger = require('bunyan').createLogger(config.log)

console.error = logger.info.bind(logger)
console.log = logger.info.bind(logger)

var npmconf = config.npm || {}
npmconf["node-version"] = null
npm.load(npmconf, function (er) {
  if (er) throw er

  // Ok, we're ready!  Spin up the cluster.
  clusterConf.signals = false
  clusterMaster(clusterConf)
  // process.removeAllListeners('SIGHUP')
  process.on('SIGHUP', function () {
    // reload configuration
    // XXX: it'd be nice if clusterMaster could have an arg
    // for a config module to reload on restarts, this is too hairy.
    var sb = config.cluster.size
    delete require.cache[require.resolve('./config.js')]
    try {
      config = require('./config.js')
    } catch (er) {
      log.error("config error", er)
      return
    }

    if (config.cluster && config.cluster.size !== sb) {
      clusterMaster.resize(config.cluster.size, function () {
        clusterMaster.restart()
      })
    } else {
      clusterMaster.restart()
    }
  })
})
