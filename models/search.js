var request = require('request')
, querystring = require('querystring')
, config = require('../config.js')
, package = require('./package.js')

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
          , fields : ['name^4', 'keywords', 'description', 'readme']
          }
        }
    , sort : ['_score']
    }

  request.get({
    url : url,
    json: payload
  }, function(e, r, o) {
    if (r.error)
      e = new Error(r.error)

    if (e)
      return cb(e)

    o.q = params.q
    o.page = page
    o.pageSize = config.elasticsearch.pageSize

    // make sure that an exact match gets the top hit
    var name = params.q.trim()
    if (!o.hits.hits ||
        !o.hits.hits.length ||
        o.hits.hits[0]._id === name && page === 0)
      return cb(e, o)

    o.hits.hits = o.hits.hits.filter(function(n) {
      return n._id !== name
    })
    if (page !== 0) {
      cb(null, o)
    } else {
      package(name, function(er, data) {
        if (er ||
            data.name !== name ||
            !data.versions ||
            !data['dist-tags'])
          return cb(null, o)

        if (!data.keywords || !Array.isArray(data.keywords)) {
          if (typeof data.keywords === 'string')
            data.keywords = data.keywords.split(/[,\s]+/)
          else
            data.keywords = []
        }
        o.hits.hits.unshift({
          _index: 'npm',
          _type: 'package',
          _id: name,
          _score: 9999,
          fields: {
            author: data.maintainers[0].name,
            keywords: data.keywords,
            description: data.description,
            version: data['dist-tags'].latest,
            name: name
          }
        })
        cb(null, o)
      })
    }
  });
}
