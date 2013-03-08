module.exports = browse

var pageSize = 100
, sanitizer = require('sanitizer')

// url is something like:
// /browse/{type?}/{arg?}/{page}
function browse (req, res) {
  var s = req.splats[0]
  if (!s) s = ''
  var page = s.match(/\/([0-9]+)\/?$/)
  if (page) {
    page = +page[1]
    s = s.replace(/\/([0-9]+)\/?$/, '')
  } else {
    page = 0
  }

  // now see if we have a type and an arg.
  s = s.split('/')
  var type = s.shift()
  var arg

  if (!type)
    type = 'updated'

  // everything but 'all' optionally takes an arg.
  if (type !== 'all' && type !== 'updated')
    arg = s.shift()

  var browseby = type
  if (arg)
    arg = sanitizer.sanitize(arg).replace(/<[^\>]+>/g, '').trim()
  if (arg)
    browseby += '/' + encodeURIComponent(arg)


  var title
  var start = page * pageSize
  var limit = pageSize
  req.model.load('browse', type, arg, start, limit)

  var sarg
  if (arg)
    sarg = encodeURIComponent(arg)
  switch (type) {
    case 'all':
      title = 'All Packages (alphabetically)'
      break
    case 'keyword':
      title = 'Browse by Keyword'
      if (sarg) title += ': ' + JSON.stringify(sarg)
      break
    case 'author':
      title = 'Browse by Author'
      if (sarg) title += ': <a href="/profile/' +
          sarg + '">' + sarg +
          '</a>'
      break
    case 'updated':
      title = 'All Packages (by updated date)'
      break
    case 'depended':
      title = sarg ? 'Packages depending on ' +
              '<a href="/package/' + sarg + '">' + sarg + '</a>'
            : 'Most Depended-upon Packages'
      break
    case 'star':
      title = sarg ? 'Users who starred ' +
              '<a href="/package/' + sarg + '">' + sarg + '</a>'
            : 'Most Starred Packages'
      break
    case 'userstar':
      title = sarg ? 'Starred Packages By User: ' +
              '<a href="/profile/' + sarg + '">' +
              sarg + '</a>'
            : 'Starred Packages by User'
      break
    default:
      return res.error(404)
  }

  req.model.load('profile', req)

  req.model.end(function (er, m) {
    if (er) return res.error(er)
    res.template('browse.js', {
      browseby: browseby,
      title: title.replace(/<(?:.|\n)*?>/gm, ''),
      pageTitle: title,
      items: m.browse,
      profile: m.profile,
      pageSize: pageSize,
      page: page
    })
  })
}
