module.exports = password

var crypto = require('crypto')

// change the password on post, if valid,
// or show the form to do the same.
function password (req, res) {
  switch (req.method) {
    case 'GET':
    case 'HEAD': return show(req, res)
    case 'POST': return handle(req, res)
    default: return res.error(405)
  }
}

function show (req, res) {
  login(req, res, function () {
    res.template('password.ejs', { profile: req.profile, error: null })
  })
}

function handle (req, res) {
  req.maxLen = 2048
  var data = null
  // need to assign this right away, so it happens.
  req.on('form', function (d) {
    data = d
  })

  login(req, res, function () {
    req.log.info('logged in')
    if (data) return handleData(req, res, data)
    req.on('form', function (data) {
      handleData(req, res, data)
    })
  })
}

function sha (s) {
  return crypto.createHash("sha1").update(s).digest("hex")
}

function handleData (req, res, data) {
  // verify that what was posted in is valid

  var prof = req.profile
  , salt = prof.salt
  , hashCurrent = sha(data.current + salt)
  , td = {profile: req.profile, error: null}

  if (hashCurrent !== prof.password_sha) {
    td.error = 'Invalid current password'
    return res.template('password.ejs', td, 403)
  }

  if (prof.password_sha !== data.password_sha) {
    td.error = 'Corrupted form data'
    return res.template('password.ejs', td, 403)
  }

  if (data.new !== data.verify) {
    td.error = 'Failed to verify password'
    return res.template('password.ejs', td, 403)
  }

  req.log.info('Changing password', {name: prof.name})

  var newAuth = { name: prof.name, password: data.new }
  // don't have to change it, we're changing it now!
  newAuth.mustChangePass = false

  req.couch.changePass(newAuth, function (er, cr, data) {
    if (er || cr.statusCode >= 400) {
      return res.error(er, cr && cr.statusCode,
                       JSON.stringify(data))
      td.error = 'Failed setting the password: '
               + (data && data.message || er && er.message)
      return res.template('password.ejs', td, cr.statusCode)
    }

    // now we're logged in with the new profile info.
    // update the profile.
    req.session.set('message', 'Password changed')
    req.couch.get('/_users/' + prof._id, function (er, cr, prof) {
      // can this ever fail?  it definitely shouldn't.
      if (er || cr.statusCode !== 200) {
        req.session.del('profile')
        return res.error(er, cr.statusCode)
      }
      req.session.set('profile', prof)
      res.redirect('/profile')
    })
  })
}

function login (req, res, cb) {
  req.session.get('profile', function (er, prof) {
    req.profile = prof
    if (er) return res.error(er)
    if (!prof || !prof.name) {
      req.session.set('done', req.url)
      return res.redirect('/login')
    }
    cb(req, res)
  })
}
