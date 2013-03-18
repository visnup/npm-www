module.exports = packagePage

var commaIt = require('comma-it').commaIt

function packagePage (req, res) {
  var name = req.params.name
  , version = req.params.version || 'latest'

  req.model.load('profile', req)
  req.model.load('package', req.params)
  req.model.load('browse', 'depended', req.params.name, 0, 1000)

  // Show download count for the last week and month.
  // since the current day might not be done loading, back up an extra
  // day as well.
  // TODO: Detailed analytics, maybe with some nice client-side chart
  var month = Date.now() - 1000 * 60 * 60 * 24 * 31
  var week = Date.now() - 1000 * 60 * 60 * 24 * 8
  var end = Date.now() - 1000 * 60 * 60 * 24
  req.model.loadAs('downloads', 'dlDay', end, end, name, false)
  req.model.loadAs('downloads', 'dlWeek', week, end, name, false)
  req.model.loadAs('downloads', 'dlMonth', month, end, name, false)

  req.model.end(function (er, m) {
    if (er && er.code === 'E404') return res.error(404, er)
    if (er) return res.error(er)
    if (!m.package) return res.error(404)
    // We are catching this one very late in the application
    // as the npm-client will have cached this response as json
    // and we are not getting a valid http error code in that case
    if (m.package.error === 'not_found') return res.error(404)

    var p = m.package
    p.dependents = m.browse
    var l = p['dist-tags'] && p['dist-tags'].latest &&
            p.versions && p.versions[p['dist-tags'].latest]
    if (l) {
      Object.keys(l).forEach(function (k) {
        p[k] = p[k] || l[k]
      })
    } else if (!version) {
      // no latest version.  this is not valid.  treat as a 404
      res.log.error('Invalid package', req.params.name)
      return res.error(404)
    }

    var locals = {
      package: p,
      profile: m.profile,
      title: m.package.name,
      dlDay: commaIt(m.dlDay),
      dlMonth: commaIt(m.dlMonth),
      dlWeek: commaIt(m.dlWeek)
    }
    res.template("package-page.ejs", locals)
  })
}
