var filed = require("filed")
, path = require("path")

module.exports = function (req, res) {
  if (req.url === '/favicon.ico') {
    return filed("favicon.ico").pipe(res)
  }

  // read from the 'static' folder.
  var f = path.join("/", req.splats.join('/'))
  var d = path.join(__dirname, '..', 'static', f)
  filed(d).pipe(res)
}
