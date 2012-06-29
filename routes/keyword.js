module.exports = keyword

// list packages based on keyword
function keyword (req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.error(405)
  }

  var kw = req.params.keyword
  if (!kw) return res.error(404)

  req.model.load('keyword', kw, req.couch.anonymous())
  req.model.load('myprofile', req)

  req.model.end(function (er, m) {
    if (er) return res.error(er)
    var locals = {
      content: "keyword.ejs",
      packages: m.keyword,
      keyword: kw,
      profile: m.myprofile
    };
    res.template('layout.ejs', locals)
  })
}
