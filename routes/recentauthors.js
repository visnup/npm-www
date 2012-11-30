module.exports = recentauthors

var pageSize = 100

// url is something like /recent-authors/:since
function recentauthors (req, res) {
  // two weeks by default.
  var s = req.splats[0]
  if (!s)
    s = ''
  var page = s.match(/\/([0-9]+)\/?$/)
  if (page) {
    page = +page[1]
    s = s.replace(/\/([0-9]+)\/?$/, '')
  } else
    page = 0

  var since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14)
  if (s !== '') {
    var ss = Date.parse(s.replace(/^\/*(.*?)\/*$/, '$1'))
    if (ss)
      since = new Date(ss)
  }
  var age = Date.now() - since.getTime()
  since = since.toISOString().slice(0, 10)

  var title = 'Authors active since ' + since
  var start = page * pageSize
  var limit = pageSize
  req.model.load('recentauthors', age, start, limit)
  req.model.load('profile', req)
  req.model.end(function (er, m) {
    if (er)
      return res.error(er)
    res.template('recentauthors.ejs', {
      browseby: since,
      title: title,
      pageTitle: title,
      items: m.recentauthors,
      profile: m.profile,
      pageSize: pageSize,
      page: page
    })
  })
}
