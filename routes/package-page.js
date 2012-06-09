module.exports = packagePage

function packagePage (req, res) {
  var name = req.params.name
  , version = req.params.version || 'latest'

  req.model.load('myprofile', req)
  req.model.load('package', req.params)
  req.model.end(function (er, m) {
    if (er) return res.error(er)
    if (!m.package) return res.error(404)
    var locals = {
      content: "package-page.ejs",
      package: m.package,
      profile: m.myprofile
    }
    res.template("layout.ejs", locals)
  })
}
