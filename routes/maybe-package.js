module.exports = maybePackage

function maybePackage (req, res) {
  var name = req.params.name
  , version = req.params.version || 'latest'

  req.model.load('package', req.params)
  req.model.end(function (er, m) {
    if (er && er.code === 'E404') return res.error(404, er)
    if (er) return res.error(er)
    if (!m.package) return res.error(404)
    return res.redirect('/package/' + m.package._id)
  })
}
