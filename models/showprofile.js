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
  })
}

function transform (data) {
  if (!data) return data
  var d = Object.keys(data).reduce(function (s, k) {
    s[k] = data[k]
    return s
  }, {})

  var gr = d.email ? 'retro' : 'mm'
  d.avatar = gravatar(d.email || '', {s:50, d:gr}, true)
  d.avatarMedium = gravatar(d.email || '', {s:100, d:gr}, true)
  d.avatarLarge = gravatar(d.email || '', {s:496, d:gr}, true)

  //Template will append "@", make sure db entry is sent out clean.
  if (d.twitter)
    d.twitter = d.twitter.replace(/^@*(.*)/, '$1').replace(/^https?:\/\/twitter.com\//, '')

  d.fields = loadFields(d)
  return d
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
