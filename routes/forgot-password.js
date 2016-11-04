var config = require('../config.js')
var userValidate = require('npm-user-validate')
var npm = require('npm')

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

module.exports = forgotPassword

// User has forgotten their password, but knows the username.
//
// Here's what needs to happen:
//
// 1. Email a token to the user's email address.
// 2. When they present that token, it changes their password to
// some random string
// 3. the next time they log in, they are forced to change passwords.
//
// Implementation:
//
// GET /forgot
// show form
//
// POST /forgot
// enter username
// token = randomBytes(18).toString('base64')
// hash = sha(token)
// link = /forgot/:token
// email link to user.
// redis.set(hash, {name, email, token})
//
// GET /forgot/:token
// hash = sha(token)
// redis.get(hash) -> name, email, token
// verify token vs presented token
// change password to random, mustChangePass = true
//
// When the user logs in, if mustChangePass,
// then direct them to /password to change it.
// Changing password clears the mustChangePass flag.
// Until password is changed, login is not valid.

function forgotPassword (req, res) {
  switch (req.method) {
    case 'POST': return handle(req, res)
    case 'GET': case 'HEAD':
      // don't accidentally expose the token in error reports.
      req.url = '/forgot'
      if (req.params && req.params.token) {
        return token(req, res)
      } else {
        return form(null, 200, req, res)
      }
    default: return res.error(405)
  }
}

function form (msg, code, req, res) {
  code = code || 200

  res.template('password-recovery-form.ejs', { error: msg }, code)
}

function token (req, res) {
  var tok = req.params.token
  , hash = sha(tok)
  config.redis.client.hgetall('pwrecover_' + hash, function (er, data) {
    if (er) {
      return res.error(er, 'Error getting token from redis')
    }

    if (!data) {
      return res.error(404, 'Token not found, or invalid')
    }

    var name = data.name
    , email = data.email
    , verify = data.token

    if (verify !== tok) {
      return res.error(404, 'Token not found, or invalid')
    }

    var couch = config.adminCouch
    , newPass = crypto.randomBytes(18).toString('base64')
    , newAuth = { name: name
                , password: newPass
                , mustChangePass: true
                }

    req.log.warn('About to change password', { name: name }, config.adminCouch.name)
    couch.changePass(newAuth, function CP (er, cr, data) {
      if (er || cr.statusCode >= 400) {
        return res.error(er, cr && cr.statusCode, data && data.error)
      }

      config.redis.client.del('pwrecover_' + hash, function () {})
      res.template('password-changed.ejs', {
        password: newPass,
        profile: null
      })
    })
  })
}

// handle the form posts.
// mint a token, put in redis, send email
function handle (req, res) {
  // POST /forgot
  // enter username or email
  // token = randomBytes(18).toString('base64')
  // hash = sha(token)
  // link = /forgot/:token
  // email link to user.
  // redis.set(hash, {name, email, token})
  req.on('form', function (data) {
    // coming from the view password-recovery-choose-user.ejs
    // after we had to choose a user because there were
    // multiple usernames for one email address
    if (data.selected_name) {
      return lookupUserByUsername(data.selected_name, req, res)
    }

    // coming from the 'normal' password-forget view
    if (!data.name_email) {
      return form('All fields are required', 400, req, res)
    }

    var nameEmail = data.name_email.trim()

    // no valid username and no valid email
    if (userValidate.username(nameEmail) && userValidate.email(nameEmail))
      return res.template('password-recovery-form.ejs', {
        error: 'Need a valid username or email address'
      }, 400)

    // look up this user.
    if (nameEmail.indexOf('@') !== -1) {
      return lookupUserByEmail(nameEmail, req, res)
    } else {
      return lookupUserByUsername(nameEmail, req, res)
    }
  })
}


function lookupUserByEmail (em, req, res) {
  var pe = '/-/user-by-email/' + em

  npm.registry.get(pe, function (er, u, resp) {
    // got multiple usernames with that email address
    // show a view where we can choose the right user
    // after chosing we get data.selectName
    if (u.length > 1) {
      return res.template('password-recovery-choose-user.ejs', {users: u})
    }
    // just one user with that email address
    if (u.length === 1) {
      name = u[0]
      return lookupUserByUsername(name, req, res)
    }

    form('Bad email, no user found with this email', 404, req, res)
  })
}

function lookupUserByUsername (name, req, res) {
  name = name.trim()

  var couch = config.adminCouch
  , pu = '/_users/org.couchdb.user:' + encodeURIComponent(name)
  , ppu = '/public_users/org.couchdb.user:' + encodeURIComponent(name)
  , didReLogin = false

  couch.get(pu, function PU (er, cr, data) {
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
      if (er) return res.error(er)
      return res.error(cr.statusCode, data.error)
    }

    // ok, it's a valid user
    // send an email to them.
    var email = data.email
    if (!email) {
      return form('Bad user, no email', 400, req, res)
    }

    var error = userValidate.email(email)
    if (error) {
      return form(error.message, 400, req, res)
    }

    // the token needs to be url-safe.
    var token = crypto.randomBytes(30).toString('base64')
                .split('/').join('_')
                .split('+').join('-')
    , hash = sha(token)
    , data = { name: name + '', email: email + '', token: token + '' }
    , key = 'pwrecover_' + hash

    config.redis.client.hmset(key, data, function (er) {
      if (er)
        return res.error(er)
      var u = 'https://' + req.headers.host + '/forgot/' + encodeURIComponent(token)
      var mail =
          { to: '"' + name + '" <' + email + '>'
          , from: 'user-account-bot@npmjs.org'
          , subject : "npm Password Reset"
          , headers: { "X-SMTPAPI": { category: "password-reset" } }
          , text: "You are receiving this because you (or someone else) have "
            + "requested the reset of the '"
            + name
            + "' npm user account.\r\n\r\n"
            + "Please click on the following link, or paste this into your "
            + "browser to complete the process:\r\n\r\n"
            + "    " + u + "\r\n\r\n"
            + "If you received this in error, you can safely ignore it.\r\n"
            + "The request will expire shortly.\r\n\r\n"
            + "You can reply to this message, or email\r\n    "
            + from + "\r\nif you have questions."
            + " \r\n\r\nnpm loves you.\r\n"
          }

      if (devMode) {
        return res.json(mail)
      } else {
        mailer.sendMail(mail, done)
      }
    })

    function done (er, result) {
      // now the token is in redis, and the email has been sent.
      if (er) return res.error(er)
      res.template('password-recovery-submitted.ejs', {profile: null})
    }
  })
}


function sha (s) {
  return crypto.createHash("sha1").update(s).digest("hex")
}
