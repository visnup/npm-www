var request = require('request')
, querystring = require('querystring')
, config = require('../config')

module.exports = search

function search(params, cb) {

  if (!params.q) {
    return cb(null, { hits: { total : 0 }})
  }

  var page = parseInt(params.page || '0', 10);

  var qs =
    { from : page*config.elasticsearch.pageSize
    , size : config.elasticsearch.pageSize
    , pretty: false
    }

  var url = config.elasticsearch.url + '/package/_search?' + querystring.stringify(qs)

  var payload =
    { fields : ['name', 'keywords','description','author', 'version']
    , query :
        { multi_match :
          { query : params.q
          , fields : ['name^4', 'keywords^3', 'description^2']
          }
        }
    , sort : ['_score']
    }

  request.get({
    url : url,
    json: payload
  }, function(e, r, o) {
    if (r.error) {
      e = new Error(r.error);
    }
    o.q = params.q;
    o.page = page;
    o.pageSize = config.elasticsearch.pageSize;

    cb(e, o);
  });
}
