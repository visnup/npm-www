module.exports = keyword

var callresp = require("cluster-callresp")

// list packages based on keyword
function keyword (req, res) {

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.error(405)
  }
console.log('here');
  showPackages(req,res);

}

function showPackages (req, res) {

  var keyword = req.params.keyword;  

  //TODO search registry for packages with keyword `keyword`

  res.template('keyword.ejs', {packages: [],keyword:keyword})
}
