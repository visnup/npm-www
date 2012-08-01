module.exports = packagePage

function packagePage (req, res) {
  var name = req.params.name
  , version = req.params.version || 'latest'

  req.model.load('profile', req)
  req.model.load('package', req.params)
  req.model.load('browse', 'depended', req.params.name, 0, 1000)
  req.model.end(function (er, m) {
    if (er && er.code === 'E404') return res.error(404, er)
    if (er) return res.error(er)
    if (!m.package) return res.error(404)

    var p = m.package
    p.dependents = m.browse
    var l = p['dist-tags'] && p['dist-tags'].latest &&
            p.versions && p.versions[p['dist-tags'].latest]
    if (l) {
      Object.keys(l).forEach(function (k) {
        p[k] = p[k] || l[k]
      })
    }
    var locals = {
      package: p,
      profile: m.profile,
      title: m.package.name
    }
    res.template("package-page.ejs", locals)
  })
}
