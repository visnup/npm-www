module.exports = keyword

var callresp = require("cluster-callresp")

// list packages based on keyword
function keyword (req, res) {

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.error(405)
  }
  
  var keyword = encodeURIComponent(req.params.keyword);

  var path = '/registry/_design/app/_view/byKeyword?startkey=[%22' + keyword + '%22]&endkey=[%22' + keyword + '%22,{}]&group_level=2';
  
  // list of packages for a given keyword
  req.couch.get(path, function (er, cr, data) {
    // data format: {"rows":[{"key":[keyword,packagename],"value":1}]}
    showPackages(req,res,data.rows);
  })

}

function showPackages (req, res, data) {

  var keyword = req.params.keyword;

  res.template('keyword.ejs', {packages: data,keyword:keyword})
}
