module.exports = css

var stylus = require("stylus")
  , nib = require("nib")
  , fs = require("fs")

function css (req, res) {
  fs.readFile("./templates/index.styl", function(err, data) {
    if (err) throw err
    stylus(data.toString())
      .use(nib())
      .render(function(err, css) {
        if (err) throw err
        res.end(css)
      })
  })
}
