// replicate 1/256th of the package records, and all
// of the public_user records except 'admin'

var replicate = require('replicate')
, Replicator = replicate.Replicator

var crypto = require('crypto')
function hash (id) {
  return crypto.createHash('sha1').update(id).digest('hex')
}

function filterPackage (id, rev) {
  return !!(hash(id).match(/^00/) || id.match(/^npm/))
}

function filterUser (id, rev) {
  return id !== 'org.couchdb.user:admin'
}

// first replicate packages, then when we don't see any
// updates for a full second, do the users.
var userTimer
, didUsers = false
console.error('replicate 1/256th of packages')
new Replicator({
  from: 'http://isaacs.iriscouch.com/registry',
  to: 'http://admin:admin@localhost:15984/registry',
  filter: filterPackage
}).push(function () {
  clearTimeout(userTimer)
  if (!didUsers) userTimer = setTimeout(replicateUsers, 1000)
})

var doneTimer
function replicateUsers () {
  if (didUsers) return
  didUsers = true
  console.error('replicate users')
  new Replicator({
    from: 'http://isaacs.iriscouch.com/public_users',
    to: 'http://admin:admin@localhost:15984/public_users',
    filter: filterUser
  }).push(function () {
    clearTimeout(doneTimer)
    doneTimer = setTimeout(done, 1000)
  })
}

function done () {
  console.error('done')
  process.exit(0)
}
