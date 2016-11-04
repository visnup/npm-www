module.exports = profileEdit
var config = require('../config.js')
var userValidate = require('npm-user-validate')

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
      return show(null, req, res)

    default:
      return res.error(405)
  }
}


function saveThenShow (data, req, res) {
  if (!data.name) {
    return show('name is required', req, res)
  }

  // get the user's own profile
  req.model.load('profile', req)
  req.model.end(function (er, m) {
    var prof = m.profile

    if (er || prof.error) {
      er.response = prof
      er.path = req.url
      res.session.set('error', er)
      res.session.set('done', req.url)
      return res.redirect('/login')
    }

    var rev = prof._rev
    Object.keys(data).forEach(function (k) {
      if (k === '_rev' ||
          k === '_id' ||
          k === 'name' ||
          k === 'type' ||
          k === 'roles' ||
          k === 'email' ||
          k === 'password_sha' ||
          k === 'salt') {
        return
      }
      prof[k] = data[k]
    })

    prof.type = 'user'
    prof.roles = []

    var pu = '/_users/' + prof._id
    req.couch.put(pu, prof, function (er, cr, data) {

      if (er || data.error) {
        er = er || new Error(data.error)
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
        res.redirect('/profile')
      })
    })
  })
}

// get the profile and show it on a form, maybe with a message
function show (err, req, res) {
  req.model.load('profile', req)
  req.model.end(function (er, m) {
    var profile = m.profile
    var statusCode = 200
    if (er || !profile || !profile.name) {
      req.session.set('done', req.url)
      return res.redirect('/login')
    }
    if (er || profile.error) {
      return res.error(er || profile.error)
    }
    var locals = {
      profile: profile,
      fields: profile.fields,
      title: 'Edit profile',
      error: err
    }

    if (err) {
      statusCode = 400
    }

    res.template("profile-edit.ejs", locals, statusCode)
  })
}
