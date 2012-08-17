module.exports = package

var LRU = require("lru-cache")
, regData = new LRU({
    max: 10000,
    maxAge: 1000 * 60 * 10
  })
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

  if (data) return cb(null, data)

  var uri = name
  if (version) uri += '/' + version
  npm.registry.get(uri, 600, false, true, function (er, data) {
    if (er) return cb(er)
    data.starredBy = Object.keys(data.users || {}).sort()
    var len = data.starredBy.length

    if (data.time && data['dist-tags']) {
      var v = data['dist-tags'].latest
      var t = data.time[v]
      if (!data.versions[v]) {
        console.error('invalid package data: %s', data._id)
        return cb(new Error('invalid package: '+ data._id))
      }
      data.version = v
      if (data.versions[v].readme) {
        data.readme = data.versions[v].readme
        data.readmeSrc = null
      }
      data.fromNow = moment(t).fromNow()
    }

    if (data.readme && !data.readmeSrc) {
      data.readmeSrc = data.readme
      data.readme = parseReadme(data.readme)
    }
    gravatarPeople(data)
    regData.set(k, data)
    return cb(null, data)
  })
}

function parseReadme (readme) {
  // allow <url>, but not arbitrary html tags.
  // any < must be the start of a <url> or <email@address>
  var e = /<(?![^ >]+(@|:\/)[^ >]+>)/g
  readme = readme.replace(e, '&lt;')
  return marked.parse(readme)
}

function gravatarPeople (data) {
  gravatarPerson(data.author)
  if (data.maintainers) data.maintainers.forEach(function (m) {
    gravatarPerson(m)
  })
  if (Array.isArray(data.contributors)) {
    data.contributors.forEach(function (m) {
      gravatarPerson(m)
    })
  }
}

function gravatarPerson (p) {
  if (!p || typeof p !== 'object') {
    return
  }
  p.avatar = gravatar(p.email || '', {s:50, d:'retro'}, true)
  p.avatarLarge = gravatar(p.email || '', {s:496, d:'retro'}, true)
}
