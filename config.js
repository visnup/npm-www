exports.keys = [ "super duper secrets go here!" ]
exports.port = 15443
exports.cluster = { size : require("os").cpus().length }
// redis auth 
exports.redis = { host: '127.0.0.1', port: 6379 }
