var config = require("./config.js")
, worker = require.resolve("./worker.js")
, clusterConf = config.cluster || {}
clusterConf.exec = worker

// set up the server cluster.
var clusterMaster = require("cluster-master")
, callresp = require("cluster-callresp")
, npm = require("npm")
, registry = require("npm/lib/utils/npm-registry-client/index.js")
, LRU = require("lru-cache")
, regData = new LRU(10000)

config.log.master = true
var logger = require('bunyan').createLogger(config.log)

console.error = logger.info.bind(logger)
console.log = logger.info.bind(logger)

// This is where the workers make requests to npm.
// It happens here so that multiple parallel requests
// don't result in broken garbage in the cache, since
// requests are not purely atomic across processes.
callresp(function (req, cb) {
  switch (req.cmd) {
    case "registry.get":
      var n = req.name
      , v = req.version
      , k = n + "/" + v
      , ma = req.hasOwnProperty('maxAge') ? req.maxAge : 600
      , nf = req.hasOwnProperty('nofollow') ? req.nofollow : false
      , stale = req.hasOwnProperty('stale') ? req.stale : true
      , data = regData.get(k)

      if (data && ma && stale) {
        return cb(null, data)
      }

      registry.get(n, v, ma, nf, stale, function (er, data, raw, res) {
        if (er) {
          er.statusCode = res && res.statusCode || 404
          er.stack = er.stack
          return cb(er, data)
        }
        regData.set(k, data)
        return cb(er, data)
      })
      break

    default:
      return cb(new Error("unknown command"))
  }
})

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
