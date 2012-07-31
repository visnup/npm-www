module.exports = packagePage

function packagePage (req, res) {
  var name = req.params.name
  , version = req.params.version || 'latest'

  req.model.load('profile', req)
  req.model.load('package', req.params)
  req.model.load('browse', 'depended', req.params.name, 0, 1000)
  req.model.end(function (er, m) {
    if (er) return res.error(er)
    if (!m.package) return res.error(404)
    m.package.dependents = m.browse
    var locals = {
      package: m.package,
      profile: m.profile
    }
    res.template("package-page.ejs", locals)
  })
}
