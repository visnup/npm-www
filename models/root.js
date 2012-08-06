// the data at the root of https://registry.npmjs.org/

var lastUpdated
var minUpdate = 10000 // update at most every 10 seconds
var fetching = false

module.exports = root
var callbacks = []
var cached = null

var npm = require('npm')
function root (cb_) {
  if (cached && Date.now() - lastUpdated < minUpdate) {
    return process.nextTick(cb_.bind(null, null, cached))
  }

  callbacks.push(cb_)
  if (fetching) return
  fetching = true

  function cb (er, data) {
    var c = callbacks.slice()
    callbacks.length = 0
    c.forEach(function (cb) {
      cb(er, data)
    })
  }

  npm.registry.get('/', function (er, data, res) {
    fetching = false
    if (er) return cb(er)
    cached = data
    lastUpdated = Date.now()
    cb(null, data)
  })
}
