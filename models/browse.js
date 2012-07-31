module.exports = browse
var qs = require('querystring')

var viewNames = {
  all: 'browseAll',
  keyword: 'byKeyword',
  updated: 'browseUpdated',
  author: 'browseAuthors'
}

// the group level when there's no arg
var groupLevel = {
  all: 2,
  keyword: 1,
  author: 1,
  updated: 4
}

// the group level when there's an arg
var groupLevelArg = {
  keyword: 3,
  author: 3
}

var transformKey = {
  all: function (k, v) { return {
    name: k[0],
    description: k[1],
    url: '/package/' + k[0],
    value: v
  }},
  keyword: function (k, v) { return {
    name: k[0],
    description: v + ' packages',
    url: '/browse/keyword/' + k[0],
    value: v
  }},
  author: function (k, v) { return {
    name: k[0],
    description: v + ' packages',
    url: '/browse/author/' + k[0],
    value: v
  }},
  updated: function (k, v) { return {
    name: k[3],
    description: 'Updated: ' + k[0] + '-' + k[1] + '-' + k[2],
    url: '/package/' + k[3],
    value: v
  }}
}

var transformKeyArg = {
  keyword: function (k, v) { return {
    name: k[1],
    description: k[2] || '',
    url: '/package/' + k[1]
  }},
  author: function (k, v) { return {
    name: k[1],
    description: k[2] || '',
    url: '/package/' + k[1]
  }}
}



var npm = require('npm')

function browse (type, arg, skip, limit, cb) {
  var u = '/-/_view/' + viewNames[type]
  var query = {}
  query.group_level = (arg ? groupLevelArg : groupLevel)[type]
  if (arg) {
    query.startkey = JSON.stringify([arg])
    query.endkey = JSON.stringify([arg, {}])
  }

  // if it normally has an arg, but not today,
  // fetch everything, and sort in descending order by value
  // manually, since couchdb can't do this.
  // otherwise, just fetch paginatedly
  if (arg || !transformKeyArg[type]) {
    query.skip = skip
    query.limit = limit
  }

  if (type === 'updated') query.descending = true

  u += '?' + qs.stringify(query)

  npm.registry.get(u, function (er, data, res) {
    if (data) data = transform(type, arg, data, skip, limit)
    return cb(er, data)
  })
}

function transform (type, arg, data, skip, limit) {
  data = data.rows.map(function (row) {
    return (arg ? transformKeyArg : transformKey)[type](row.key, row.value)
  })

  // normally has an arg.  sort, and then manually paginate.
  if (!arg && transformKeyArg[type]) {
    data = data.sort(function (a, b) {
      return a.value === b.value ? (
        a.name === b.name ? 0 : a.name < b.name ? -1 : 1
      ) : a.value > b.value ? -1 : 1
    }).slice(skip, skip + limit)
  }

  return data
}
