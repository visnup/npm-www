module.exports = about

var config = require('../config.js')
function about (req, res) {
  res.template('about.ejs', config)
}
