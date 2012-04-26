module.exports = css

var stylus = require("stylus")
  , fs = require("fs")

function css (req, res) {
  fs.readFile("./templates/index.styl", function(err, data) {
    if (err) throw err
    stylus.render(data.toString(), function(err, css) {
      if (err) throw err
      res.end(css)
    })
  })
}
