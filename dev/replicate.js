// replicate just enough records to be useful for testing.
// around 1000 packages, plus some known popular ones, and all
// the public user docs except 'admin', which is the user account
// to use for testing features.

var replicate = require('replicate')
, Replicator = replicate.Replicator
, request = require('request')

var crypto = require('crypto')
function hash (id) {
  return crypto.createHash('sha1').update(id).digest('hex')
}

function filterPackage (id, rev) {
  return !!(hash(id).match(/^00/) ||
      id.match(/^(npm.*|request|underscore|express|coffee-script|async)$/))
}

// add some more once we've got the first batch
function filterPackageMore (id, rev) {
  return !!(hash(id).match(/^0/))
}

function filterUser (id, rev) {
  return id !== 'org.couchdb.user:admin'
}

// first sync up the design docs, since this is the most important
// thing for the dev server starting up properly.
var ddocs =
  [ 'registry/_design/app',
    'registry/_design/ghost',
    'registry/_design/scratch' ]
function replicateDdocs () {
  var ddoc = ddocs.pop()
  if (!ddoc) return replicatePackages()
  request({ url: 'http://isaacs.iriscouch.com/' + ddoc, json: true }, then)
  function then (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 200) {
      throw new Error('wtf?\n' + JSON.stringify([res.statusCode, body]))
    }
    request.put({ url: 'http://admin:admin@localhost:15984/' + ddoc +
                       '?new_edits=false', body: body, json: true }, then2)
  }
  function then2 (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 201) {
      throw new Error('wtf?\n' + JSON.stringify([res.statusCode, body]))
    }
    console.error(body)
    replicateDdocs()
  }
}


// replicate packages, then when we don't see any
// updates for a full second, do the users.
var userTimer
, didUsers = false
, didMorePackages = false

function replicatePackages () {
  console.error('replicate packages (around 1/256th of the registry)')
  new Replicator({
    from: 'http://isaacs.iriscouch.com/registry',
    to: 'http://admin:admin@localhost:15984/registry',
    filter: filterPackage
  }).push(function () {
    clearTimeout(userTimer)
    if (!didUsers) userTimer = setTimeout(replicateUsers, 1000)
  })
}

var morePackagesTimer
function replicateUsers () {
  if (didUsers) return
  didUsers = true
  console.error('replicate users')
  new Replicator({
    from: 'http://isaacs.iriscouch.com/public_users',
    to: 'http://admin:admin@localhost:15984/public_users',
    filter: filterUser
  }).push(function () {
    if (didMorePackages) return
    clearTimeout(morePackagesTimer)
    morePackagesTimer = setTimeout(morePackages, 1000)
  })
}

// now replicate more packages.  by this time, the site has
// probably started up if you did `npm run dev`, but we can
// back-fill to get more interesting stuff.
var doneTimer
function morePackages () {
  if (didMorePackages) return
  didMorePackages = true
  console.error('even more packages (around 1/16th of the registry)')
  new Replicator({
    from: 'http://isaacs.iriscouch.com/registry',
    to: 'http://admin:admin@localhost:15984/registry',
    filter: filterPackageMore
  }).push(function () {
    // this one we just let continue indefinitely.
  })

  new Replicator({
    from: 'http://isaacs.iriscouch.com/downloads',
    to: 'http://admin:admin@localhost:15984/downloads'
  }).push(function () {
    // this one we just let continue indefinitely.
  })
}

// start it going
replicateDdocs()
