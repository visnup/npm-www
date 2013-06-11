// All routes require login.
//
// At each page, show "Email admins if you are confused/suspicious"
//
// GET /email-edit
// show "new email address" form
//
// POST /email-edit, email=email2
// confirmToken = randomBytes(18).toString('base64')
// confirmHash = sha(confirmToken)
// confirmLink = /email-edit/confirm/:confirmToken
// revertToken = randomBytes(18).toString('base64')
// revertHash = sha(revertToken)
// revertLink = /email-edit/revert/:revertToken
// send to email1: "Changing to email2. To revert: revertLink"
// send to email2: "Click confirmLink to confirm email change"
// redis.set(confirmHash, {name, emai1l, email2, confirmToken})
// redis.set(revertHash, {name, emai1l, email2, revertToken, confirmHash})
//
// GET /email-edit/confirm/:token
// hash = sha(token)
// redis.get(hash) -> name, email1, email2, token
// verify token vs presented token
// Change email address to email2
// redis.del(hash)
//
// GET /email-edit/revert/:token
// hash = sha(token)
// redis.get(hash) -> name, email1, email2, token, confirmHash
// verify token vs presented token
// change user's email to email1
// redis.del(confirmHash)

module.exports = emailEdit

var config = require('../config.js')
var userValidate = require('npm-user-validate')

// if there's no email configuration set up, then we can't do this.
// however, in dev mode, just show the would-be email right on the screen
var devMode = false
if (!config.mailTransportType ||
    !config.mailTransportSettings) {
  if (process.env.NODE_ENV === 'dev') {
    devMode = true
  } else {
    module.exports = function (req, res) {
      res.error(404, 'Not implemented')
    }
    return
  }
}

var from = config.emailFrom
, crypto = require('crypto')

if (!devMode) {
  var nodemailer = require('nodemailer')
  , mailer = nodemailer.createTransport(config.mailTransportType,
                                        config.mailTransportSettings)
}

function emailEdit (req, res) {
  switch (req.method) {
    case 'POST':
    case 'PUT':
      return handle(req, res)

    case 'HEAD':
    case 'GET':
      // don't accidentally expose the token in error reports.
      req._originalUrl = req.url
      req.url = '/email-edit'
      if (req.params && req.params.action) {
        if (!req.params.token) return res.error(404)
        switch (req.params.action) {
          case 'revert': return revert(req, res)
          case 'confirm': return confirm(req, res)
          default: return res.error(404)
        }
      } else {
        return form(null, null, req, res)
      }

    default: return res.error(405)
  }
}

function form (er, code, req, res) {
  login(req, res, function (profile) {
    res.template('email-edit.ejs', {
      profile: profile,
      error: er
    }, code || 200)
  })
}

function handle (req, res) {
  req.maxLen = 8 * 1024
  req.on('form', function (data) {
    var email2 = data.email
    if (!email2)
      return form('Must provide email address', 400, req, res)
    var invalid = userValidate.email(email2)
    if (invalid)
      return form(invalid, 400, req, res)

    login(req, res, function (profile) {
      // first verify the password was posted in is valid
      var salt = profile.salt
      var pwhash = sha(data.password + salt)
      if (pwhash !== profile.password_sha) {
        return res.template('email-edit.ejs', {
          error: 'Invalid password',
          profile: profile
        }, 403)
      }

      if (profile.password_sha !== data.password_sha) {
        return res.template('email-edit.ejs', {
          error: 'Corrupted form data',
          profile: profile
        }, 403)
      }

      handle_(req, res, profile, email2)
    })
  })
}

function handle_ (req, res, profile, email2) {
  var confTok = crypto.randomBytes(18).toString('base64')
  var confHash = sha(confTok)
  var confKey = 'email_change_conf_' + confHash
  var confLink = '/email-edit/confirm/' + confHash
  var revTok = crypto.randomBytes(18).toString('base64')
  var revHash = sha(revTok)
  var revLink = '/email-edit/revert/' + revHash
  var revKey = 'email_change_rev_' + revHash

  // send to email1: "Changing to email2. To revert: revertLink"
  // send to email2: "Click confirmLink to confirm email change"
  // redis.set(confirmHash, {name, emai1l, email2, confirmToken})
  // redis.set(revertHash, {name, emai1l, email2, revertToken, confirmHash})

  var email1 = profile.email
  var name = profile.name
  var conf = {
    name: name,
    email1: email1,
    email2: email2,
    token: confTok,
    hash: confHash
  }
  var rev = {
    name: name,
    email1: email1,
    email2: email2,
    token: revTok,
    hash: revHash,
    confHash: confHash
  }

  var n = 2
  config.redis.client.hmset(revKey, rev, then)
  config.redis.client.hmset(confKey, conf, then)

  function then (er) {
    if (er)
      res.error(er)
    else if (--n === 0)
      sendEmails(conf, rev, profile, req, res)
  }
}

function sendEmails (conf, rev, profile, req, res) {
  var name = conf.name
  var urlStart = 'https://' + req.headers.host + '/email-edit/'
  var confUrl = urlStart + 'confirm/' + encodeURIComponent(conf.token)
  var revUrl = urlStart + 'revert/' + encodeURIComponent(rev.token)

  var confMail =
    { to: '"' + name + '" <' + conf.email2 + '>'
    , from: 'user-account-bot@npmjs.org'
    , subject: 'npm Email Confirmation'
    , headers: { 'X-SMTPAPI': { category: 'email-change-confirm' } }
    , text: 'You are receiving this because you have (or someone else has) '
      + 'requested that the email address of the \''
      + name
      + '\' npm user account be changed from\r\n'
      + '    <' + conf.email1 + '>\r\n'
      + 'to:\r\n'
      + '    <' + conf.email2 + '>\r\n\r\n'
      + 'Please click the following link, or paste into your browser '
      + 'to complete the process.\r\n\r\n'
      + '    ' + confUrl + '\r\n\r\n'
      + 'If you received this in error, you can safely ignore it.\r\n\r\n'
      + 'The request will expire shortly.\r\n\r\n'
      + 'You can reply to this message, or email\r\n'
      + '    ' + from + '\r\n'
      + 'if you have any questions.\r\n\r\n'
      + 'npm loves you.\r\n'
    }

  var revMail =
    { to: '"' + name + '" <' + rev.email1 + '>'
    , from: 'user-account-bot@npmjs.org'
    , subject: 'npm Email Change Alert'
    , headers: { 'X-SMTPAPI': { category: 'email-change-revert' } }
    , text: 'You are receiving this because you have (or someone else has) '
      + 'requested that the email address of the \''
      + name
      + '\' npm user account be changed from\r\n'
      + '    <' + rev.email1 + '>\r\n'
      + 'to:\r\n'
      + '    <' + rev.email2 + '>\r\n\r\n'
      + '\r\n'
      + 'If this was intentional, you can safely ignore this message.  '
      + 'However, a confirmation email was sent to <' + rev.email2 + '> '
      + 'with a link that must be clicked '
      + 'to complete the process.\r\n\r\n'
      + 'IMPORTANT: If this was NOT intentional, then your account '
      + 'MAY have been compromised.  Please click the following link '
      + 'to revert the change immediately:\r\n'
      + '    ' + revUrl + '\r\n\r\n'
      + 'And then visit https://' + req.headers.host + '/ and change your '
      + 'password right away.\r\n\r\n'
      + 'You can reply to this message, or email\r\n'
      + '    ' + from + '\r\n'
      + 'if you have any questions.\r\n\r\n'
      + 'npm loves you.\r\n'
    }

  if (devMode)
    return res.json({confirm: confMail, revert: revMail})

  // don't send the confmail until we know the revert mail was sent!
  mailer.sendMail(revMail, function (er, result) {
    if (er)
      return res.error(er)
    mailer.sendMail(confMail, function (er, result) {
      if (er)
        return res.error(er)
      res.template('email-edit-submitted.ejs', { profile: profile })
    })
  })
}

function sha (s) {
  return crypto.createHash("sha1").update(s).digest("hex")
}

function login (req, res, cb) {
  var u = req._originalUrl || req.url
  req.model.load('profile', req, true)
  req.model.end(function (er, m) {
    if (er)
      return req.session.set('done', u, function () {
        res.redirect('/login')
      })
    cb(m.profile)
  })
}

function revert (req, res) {
  var token = req.params.token
  if (!token)
    return res.error(400)

  var revHash = sha(token)
  var revKey = 'email_change_rev_' + revHash

  login(req, res, function (profile) {
    config.redis.client.hgetall(revKey, function (er, data) {
      if (er)
        return res.error(er, 'Error getting token from redis')

      if (!data)
        return res.error(404, 'Token not found, or invalid')

      var name = data.name
      if (name !== profile.name)
        return res.error(403, 'This request was for someone else')

      var email1 = data.email1
      var email2 = data.email2
      var confHash = data.confHash
      var hash = data.hash
      if (hash !== revHash)
        return res.error(500, 'Math is broken, sorry')

      var confKey = 'email_change_conf_' + confHash
      // first, invalidate the confirmation req
      // del doesn't raise an error if it's already gone.
      config.redis.client.del(confKey, function (er) {
        if (er)
          return res.error(er)
        config.redis.client.del(revKey, function (er) {
          if (er)
            return res.error(er)
          // now make sure that the email is the correct one
          if (profile.email === email1)
            return res.template('email-edit-reverted.ejs', { profile: profile })

          // uh, oh.  set it back to the old one in couchdb
          setEmail(profile, email1, 'email-edit-reverted.ejs', req, res)
        })
      })
    })
  })
}

function setEmail (profile, email, template, req, res) {
  var name = profile.name
  var couch = config.adminCouch
  var pu = '/_users/org.couchdb.user:' + encodeURIComponent(name)
  var ppu = '/public_users/org.couchdb.user:' + encodeURIComponent(name)
  var didReLogin = false

  couch.get(pu, function PU (er, cr, data) {
    // TODO(isaacs): This relogin business should be in the couch-login module
    if (!er && cr.statusCode === 404) {
      if (!didReLogin) {
        // *maybe* the user doesn't exist, but maybe couchdb is just lying
        // because our admin login expired.
        return couch.get(ppu, function PPU (er2, cr2, data) {
          if (!er2 && (cr2.statusCode === 200 || cr.statusCode === 401)) {
            // fetching the public user worked fine.
            // admin login failed.
            // re-login and try again.
            return config.adminCouch.tokenGet(function (er3, tok) {
              if (er3) return res.error(500, er)
              didReLogin = true
              couch.get(pu, PU)
            })
          }

          // actually doesn't exist.
          return form('Sorry! User does not exist', 404, req, res)
        })
      }
      // actually doesn't exist.
      return form('Sorry! User does not exist', 404, req, res)
    }

    if (er || cr.statusCode >= 400) {
      if (er)
        return res.error(er)
      else
        return res.error(cr.statusCode, data && data.error)
    }

    // ok it's a valid user
    if (data.email === email)
      return res.template(template, { profile: profile })

    data.email = email
    couch.put(pu, data, function (er, cr, data) {
      if (er || data.error || cr.statusCode >= 400) {
        er = er || new Error(data.error)
        if (cr.statusCode >= 400)
          er.code = cr.statusCode
        res.error(er)
      } else {
        // Put the new profile info in the session, so we don't get
        // confusing messages.
        profile.email = email
        req.session.set('profile', profile, function () {
          res.template(template, { profile: profile })
        })
      }
    })
  })
}

function confirm (req, res) {
  var token = req.params.token
  if (!token)
    return res.error(400)

  var confHash = sha(token)
  var confKey = 'email_change_conf_' + confHash
  login(req, res, function (profile) {
    config.redis.client.hgetall(confKey, function (er, data) {
      if (er)
        return res.error(er, 'Error getting token from redis')

      if (!data)
        return res.error(404, 'Token not found, or invalid')

      var name = data.name
      if (name !== profile.name)
        return res.error(403, 'This request was for someone else')

      var email1 = data.email1
      var email2 = data.email2
      var confTok = data.token
      var hash = data.hash
      if (hash !== confHash)
        return res.error(500, 'Math is broken, sorry')

      // delete the confirmation token now
      config.redis.client.del(confKey, function (er) {
        if (er)
          return res.error(er, 'Error removing token from redis')
        setEmail(profile, email2, 'email-edit-confirmed.ejs', req, res)
      })
    })
  })

}
