var config = require('../config.js')

if (!config.mailTransportType ||
    !config.mailTransportSettings) {
  module.exports = function (req, res) {
    res.error(404, 'Not implemented')
  }
  return
}

var nodemailer = require('nodemailer')
, mailer = nodemailer.createTransport(config.mailTransportType,
                                      config.mailTransportSettings)
, from = config.emailFrom
, crypto = require('crypto')

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
        return form(req, res)
      }
    default: return res.error(405)
  }
}

function form (req, res) {
  res.template('password-recovery-form.ejs')
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
    var didReLogin = false

    req.log.warn('About to change password', { name: name })
    couch.changePass(newAuth, function CP (er, cr, data) {
      if (cr && cr.statusCode === 404 && !didReLogin) {
        // probably the admin session expired.
        // try to re-login
        return couch.tokenGet(function (er2, tok) {
          if (er2 || !couch.valid(tok)) {
            er = er || er2
            return res.error(500, er, 'admin couchdb token failure')
          }
          didReLogin = true
          couch.changePass(newAuth, CP)
        })
      }

      if (er || cr.statusCode >= 400) {
        return res.error(er, cr && cr.statusCode, data && data.error)
      }

      config.redis.client.del('pwrecover_' + hash, function () {})
      res.template('password-changed.ejs', { password: newPass, profile: null })
    })
  })
}

// handle the form post.
// mint a token, put in redis, send email
function handle (req, res) {
  // POST /forgot
  // enter username
  // token = randomBytes(18).toString('base64')
  // hash = sha(token)
  // link = /forgot/:token
  // email link to user.
  // redis.set(hash, {name, email, token})
  req.on('form', function (data) {
    if (!data.name) {
      return res.error(400, 'Bad request')
    }

    var name = encodeURIComponent(data.name)
    if (name !== data.name) {
      return res.error(400, 'Bad request')
    }

    // look up this user.
    var couch = config.adminCouch
    , pu = '/_users/org.couchdb.user:' + name
    , ppu = '/public_users/org.couchdb.user:' + name
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
            return res.error(404, er)
          })
        }
        // actually doesn't exist.
        return res.error(404, er)
      }

      if (er || cr.statusCode >= 400) {
        if (er) return res.error(er)
        return res.error(cr.statusCode, data.error)
      }

      // ok, it's a valid user
      // send an email to them.
      var email = data.email
      if (!email) {
        return res.error(400, 'Bad user, no email')
      }

      // the token needs to be url-safe.
      var token = crypto.randomBytes(30).toString('base64')
                  .split('/').join('_')
                  .split('+').join('-')
      , hash = sha(token)
      , data = { name: name, email: email, token: token }
      , key = 'pwrecover_' + hash

      config.redis.client.hmset(key, data)
      var u = 'https://' + req.headers.host + '/forgot/' + encodeURIComponent(token)
      mailer.sendMail
        ( { to: '"' + name + '" <' + email + '>'
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
        , done
        )

      function done (er, result) {
        // now the token is in redis, and the email has been sent.
        if (er) return res.error(er)
        res.template('password-recovery-submitted.ejs', {profile: null})
      }
    })
  })
}


function sha (s) {
  return crypto.createHash("sha1").update(s).digest("hex")
}
