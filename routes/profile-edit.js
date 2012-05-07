module.exports = profileEdit
var config = require('../config.js')

// thing for editing bits of your profile.
// gets saved back to couchdb.
function profileEdit (req, res) {
  // show a form if it's a GET, or accept body if it's a POST.
  switch (req.method) {
    case 'POST':
    case 'PUT':
      req.maxLen = 1024 * 1024
      return req.on('form', function (data) {
        saveThenShow(data, req, res)
      })

    case 'HEAD':
    case 'GET':
      return show(req, res)

    default:
      return res.error(405)
  }
}


function saveThenShow (data, req, res) {
  console.error('data', data)
  if (!data.name) {
    return res.error(new Error('name is required'), 400)
  }

  var pu = '/_users/' + data._id

  // first get all the data, then fold in the new bits.
  req.couch.get(pu, function (er, cr, prof) {
    if (er || data.error) {
      er.response = data
      er.path = req.url
      res.session.set('error', er)
      res.session.set('done', req.url)
      return res.redirect('/login')
    }

    var rev = prof._rev
    Object.keys(data).forEach(function (k) {
      prof[k] = data[k]
    })

    req.couch.put(pu + '?rev=' + rev, prof
                 , function (er, cr, data) {

      if (er || data.error) {
        er.response = data
        er.path = req.url
        res.session.set('error', er)
        res.session.set('done', req.url)
        return res.redirect('/login')
      }

      // show the profile page, and while that's happening,
      // also fetch the updated profile in the background
      // and save into the redis session
      req.couch.get(pu, function (er, cr, data) {
        res.session.set('profile', data)
      })
      res.redirect('/profile')
    })
  })
}

// get the profile and show it on a form, maybe with a message
function show (req, res) {
  var name = req.cookies.name
  if (name) return show_(name, req, res)
  req.session.get('profile', function (er, profile) {
    if (er || !profile || !profile.name) {
      req.session.set('done', req.url)
      return res.redirect('/login')
    }
    show_(profile.name, req, res)
  })
}

function show_ (name, req, res) {
  var u = '/_users/org.couchdb.user:' + name
  req.couch.get(u, function (er, cr, data) {
    if (er || data.error) return res.error(er)
    var td = { profile: data
             , fields: config.profileFields }
    res.template('profile-edit.ejs', td)
  })
}
