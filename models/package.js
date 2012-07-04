module.exports = package

var LRU = require("lru-cache")
, regData = new LRU(10000)
, marked = require("marked")
, gravatar = require('gravatar').url
, npm = require("npm")
, moment = require('moment')

function package (params, cb) {
  var name, version

  if (typeof params === 'object') {
    name = params.name
    version = params.version
  } else {
    var p = params.split('@')
    name = p.shift()
    version = p.join('@')
  }
  // version = version || 'latest'
  version = version || ''

  var k = name + '/' + version
  , data = regData.get(k)

  // remove excessively stale data
  // ignore anything over 10 minutes old
  if (data && !params.nocache) {
    var age = Date.now() - data._time
    if (age > 10 * 60 * 1000) {
      regData.del(k)
      data = null
    }
  }

  if (data) return cb(null, data)

  var uri = name
  if (version) uri += '/' + version
  npm.registry.get(uri, 600, false, true, function (er, data) {
    if (er) return cb(er)
    data.starredBy = Object.keys(data.users || {}).sort()
    var len = data.starredBy.length
    , diff = len - 10
    data.starredByMsg = ''

    data._time = Date.now()
    if (data.readme) data.readme = parseReadme(data.readme)
    gravatarPeople(data)
    regData.set(k, data)
    data.fromNow = moment(data.time[data['dist-tags'].latest]).fromNow()
   
    if (len > 10) {
      data.starredBy = data.starredBy.slice(0,10)
      var many = ' others...'
      if (diff == 1) many = ' other.'
      data.starredByMsg = ' and ' +  diff + many
    }

    return cb(null, data)
  })
}

function parseReadme (readme) {
  // allow <url>, but not arbitrary html tags.
  // any < must be the start of a <url> or <email@address>
  var e = /^<(?![^ >]+(@|:\/)[^ >]+>)/g
  readme = readme.replace(e, '&lt;')
  return marked.parse(readme)
}

function gravatarPeople (data) {
  gravatarPerson(data.author)
  if (data.maintainers) data.maintainers.forEach(function (m) {
    gravatarPerson(m)
  })
  if (data.contributors) data.contributors.forEach(function (m) {
    gravatarPerson(m)
  })
}

function gravatarPerson (p) {
  if (!p || typeof p !== 'object') {
    return
  }
  p.avatar = gravatar(p.email || '', {s:50, d:'retro'}, true)
}
