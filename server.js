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
  clusterMaster(clusterConf)
})
