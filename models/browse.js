module.exports = browse
var qs = require('querystring')

var viewNames = {
  all: 'browseAll',
  keyword: 'byKeyword',
  updated: 'browseUpdated',
  author: 'browseAuthors',
  depended: 'dependedUpon',
  star: 'browseStarPackage',
  userstar: 'browseStarUser'
}

// the group level when there's no arg
var groupLevel = {
  all: 2,
  keyword: 1,
  author: 1,
  updated: 3,
  depended: 1,
  star: 2,
  userstar: 1
}

// the group level when there's an arg
var groupLevelArg = {
  keyword: 3,
  author: 3,
  depended: 3,
  star: 3,
  userstar: 3
}

var transformKey = {
  all: function (k, v) { return {
    name: k[0],
    description: k[1],
    url: '/package/' + k[0],
    value: v
  }},

  updated: function (k, v) { return {
    name: k[1],
    description: k[2] + ' - ' + k[0].substr(0, 10),
    url: '/package/' + k[1],
    value: k[0]
  }},

  keyword: tk,
  author: tk,
  depended: tk,
  userstar: tk,

  star: function (k, v, type) { return {
    name: k[0],
    description: k[1] + ' - ' + v,
    url: '/browse/' + type + '/' + k[0],
    value: v
  }},
}

function tk (k, v, type) { return {
  name: k[0],
  description: v + ' packages',
  url: '/browse/' + type + '/' + k[0],
  value: v
}}

var transformKeyArg = {
  keyword: tka,
  author: tka,
  depended: tka,
  userstar: tka,
  star: function (k, v) { return {
    name: k[2],
    description: '',
    url: '/browse/userstar/' + k[2]
  }}
}

function tka (k, v) { return {
  name: k[1],
  description: k[2] || '',
  url: '/package/' + k[1]
}}



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
    var fn = (arg ? transformKeyArg : transformKey)[type]
    return fn(row.key, row.value, type)
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
