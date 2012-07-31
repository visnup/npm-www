module.exports = indexPage

function indexPage (req, res) {
  var name = req.params.name
  , version = req.params.version || 'latest'

  req.model.loadAs('browse', 'starred', 'userstar', null, 0, 10)
  req.model.loadAs('browse', 'authors', 'author', null, 0, 10)
  req.model.loadAs('browse', 'depended', 'depended', null, 0, 10)
  req.model.loadAs('browse', 'updated', 'updated', null, 0, 10)
  req.model.load('profile', req)

  req.model.end(function (er, m) {
    var locals = {
      index: m.index,
      profile: m.profile,
      title: 'npm',
      updated: m.updated,
      authors: m.authors,
      starred: m.starred,
      depended: m.depended
    }
    res.template("index.ejs", locals)
  })
}
