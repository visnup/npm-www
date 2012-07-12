module.exports = indexPage

function indexPage (req, res) {
  var name = req.params.name
  , version = req.params.version || 'latest'

  req.model.load('profile', req)
  req.model.end(function (er, m) {
    // errors are fine here.  generally just means login expired.
    var locals = {
      index: m.index,
      profile: m.profile
    }
    res.template("index.ejs", locals)
  })
}
