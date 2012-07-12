module.exports = about

var config = require('../config.js')
var td = {}
Object.keys(config).forEach(function (k) {
  td[k] = config[k]
})
td.title = 'About'
function about (req, res) {
  req.model.load("profile", req);
  req.model.end(function(er, m) {
    if(er) return res.error(er);
    td.profile = m.profile;
    res.template('about.ejs', td)
  })
}
