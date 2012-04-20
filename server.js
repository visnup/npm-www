var config = require("./config.js")
, worker = require.resolve("./worker.js")
, clusterConf = config.cluster || {}
clusterConf.exec = worker

// set up the server cluster.
var clusterMaster = require("cluster-master")
clusterMaster(clusterConf)
