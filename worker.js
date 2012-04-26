// the http server.
// Runs in the cluster worker processes.

var cluster = require("cluster")
if (cluster.isMaster) {
  throw new Error("should only be invoked as cluster worker")
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
