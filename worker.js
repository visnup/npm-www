// the http server.
// Runs in the cluster worker processes.

var cluster = require("cluster")
if (cluster.isMaster) {
  // just spin up one worker for dev stuff
  config.cluster.size = 1
  require("./server.js")
  return
}

var config = require("./config.js")
, http = require("http")
, https = require("https")
, site = require("./site.js")

if (config.https) {
  https.createServer(config.https, site).listen(config.port)
  console.log("SSL Listening on %d", config.port)
} else {
  http.createServer(site).listen(config.port)
  console.log("Listening on %d", config.port)
}
