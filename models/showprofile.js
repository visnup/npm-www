module.exports = showprofile
module.exports.transform = transform

var gravatar = require('gravatar').url
var npm = require('npm')
var gravatar = require('gravatar').url
var sanitizer = require('sanitizer')
var config = require('../config.js')
var util = require('util')
var url = require('url')


function showprofile (name, cb) {
  // get the most recent data for this req.
  npm.registry.get('/-/user/org.couchdb.user:' + name, 0, function (er, data) {
    if (er || !data) return cb(er, data)
    cb(er, transform(data))

    cb(er, data)
  })
}

function transform (data) {
  var gr = data.email ? 'retro' : 'mm'
  data.avatar = gravatar(data.email || '', {s:50, d:gr}, true)
  data.avatarLarge = gravatar(data.email || '', {s:496, d:gr}, true)

  data.fields = loadFields(data)
}

function loadFields (profile) {
  return Object.keys(config.profileFields).map(function (f) {
    var val = sanitizer.escape(profile[f] || '')
    var title = config.profileFields[f][0] || f
    var tpl = config.profileFields[f][1] || '%s'
    var show = val ? tpl.replace(/%s/g, val) : ''
    var urlTest = config.profileFields[f][2]
    show = show && sanitizer.sanitize(show, function (u) {
      u = url.parse(u)
      return (!u || !u.href || !urlTest || !urlTest(u)) ? '' : u.href
    }) || ''
    return {
      name: f,
      value: val,
      title: title,
      show: show
    }
  })
}
