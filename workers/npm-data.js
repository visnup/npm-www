// This module should be loaded with child_process.fork().
// It communicates npm data over the IPC API.

// TODO: support PUT/etc.
// TODO: Cache in Redis, as well as backing npm fs cache
// TODO: Sit on the _changes feed and update caches maybe?

if (!process.send) {
  throw new Error("This file should be called via child_process.fork")
}

var npm = require("npm")
, config = require("../config.js")
, request = require("request")
, registry = require("npm/lib/utils/npm-registry-client/index.js")
, LRU = require("lru-cache")
, cache = new LRU(5000)
, ready = false
, queue = []

npm.load(config.npmConfig || {}, function (er) {
  if (er) throw er

  ready = true
  flush()
})

function flush () {
  if (!ready) return
  queue.forEach(onMsg)
  queue = null
}


process.on("message", onMsg)

function onMsg (msg) {
  if (!ready) return queue.push(msg)

  console.error("npm-data message", msg)
  var p = msg.project
  , v = msg.version
  , t = msg.timeout || config.npmtimeout || 60000
  , nf = msg.nofollow || false
  , staleOk = true

  var k = p + "/" + v
  , cached = cache.get(k)
  if (cached) return process.send({ok: true, data: cached, id: msg.id })

  registry.get(p, v, t, nf, staleOk, function (er, d) {
    console.error("back from registry.get", er, d)
    if (er) {
      var error = {}
      for (var i in er) error[i] = er[i]
      return process.send({ ok: false, error: error, id: msg.id })
    }

    cache.set(k, d)
    return process.send({ ok: true, data: d, id: msg.id })
  })
}
