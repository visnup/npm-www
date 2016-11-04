module.exports = package

var LRU = require("lru-cache")
, regData = new LRU({
    max: 10000,
    maxAge: 1000 * 60 * 10
  })
, marked = require("marked")
, sanitizer = require('sanitizer')
, gravatar = require('gravatar').url
, npm = require("npm")
, moment = require('moment')
, url = require('url')

function urlPolicy (u) {
  u = url.parse(u)
  if (!u) return null
  if (u.protocol === 'http:' &&
      (u.hostname && u.hostname.match(/gravatar.com$/))) {
    // use encrypted gravatars
    return url.format('https://secure.gravatar.com' + u.pathname)
  }
  return url.format(u)
}

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

      setLicense(data, v)
    }

    if (data.homepage && typeof data.homepage !== 'string') {
      if (Array.isArray(data.homepage))
        data.homepage = data.homepage[0]
      if (typeof data.homepage !== 'string')
        delete data.homepage
    }

    if (data.readme && !data.readmeSrc) {
      data.readmeSrc = data.readme
      data.readme = parseReadme(data)
    }
    gravatarPeople(data)
    regData.set(k, data)
    return cb(null, data)
  })
}

function parseReadme (data) {
  var p
  if (typeof data.readmeFilename !== 'string' ||
      (data.readmeFilename.match(/\.(m?a?r?k?d?o?w?n?)$/i) &&
       !data.readmeFilename.match(/\.$/))) {
    try {
      p = marked.parse(data.readme)
    } catch (er) {
      return 'error parsing readme'
    }
    p = p.replace(/<([a-zA-Z]+)([^>]*)\/>/g, '<$1$2></$1>')
  } else {
    var p = data.readme
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
    p = sanitizer.sanitize(p, urlPolicy)
  }
  return sanitizer.sanitize(p, urlPolicy)
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

function setLicense (data, v) {
  var latestInfo = data.versions[v], license

  if (latestInfo.license)
    license = latestInfo.license
  else if (latestInfo.licenses)
    license = latestInfo.licenses
  else if (latestInfo.licence)
    license = latestInfo.licence
  else if (latestInfo.licences)
    license = latestInfo.licences
  else
    return

  data.license = {}

  if (Array.isArray(license)) license = license[0]

  if (typeof license === 'object') {
    if (license.type) data.license.name = license.type
    if (license.name) data.license.name = license.name
    if (license.url) data.license.url = license.url
  }

  if (typeof license === 'string') {
    if (license.match(/(http|https)(:\/\/)/ig)) {
      data.license.url = data.license.type = license
    } else {
      data.license.url = getOssLicenseUrlFromName(license)
      data.license.name = license
    }
  }
}

function getOssLicenseUrlFromName (name) {
  var base = 'http://opensource.org/licenses/'

  var licenseMap = {
    'bsd': 'BSD-2-Clause',
    'mit': 'MIT',
    'x11': 'MIT',
    'mit/x11': 'MIT',
    'apache 2.0': 'Apache-2.0',
    'apache2': 'Apache-2.0',
    'apache 2': 'Apache-2.0',
    'apache-2': 'Apache-2.0',
    'apache': 'Apache-2.0',
    'gpl': 'GPL-3.0',
    'gplv3': 'GPL-3.0',
    'gplv2': 'GPL-2.0',
    'gpl3': 'GPL-3.0',
    'gpl2': 'GPL-2.0',
    'lgpl': 'LGPL-2.1',
    'lgplv2.1': 'LGPL-2.1',
    'lgplv2': 'LGPL-2.1'
  }

  return licenseMap[name.toLowerCase()]
         ? base + licenseMap[name.toLowerCase()]
         : base + name
}

function gravatarPerson (p) {
  if (!p || typeof p !== 'object') {
    return
  }
  p.avatar = gravatar(p.email || '', {s:50, d:'retro'}, true)
  p.avatarMedium = gravatar(p.email || '', {s:100, d:'retro'}, true)
  p.avatarLarge = gravatar(p.email || '', {s:496, d:'retro'}, true)
}
