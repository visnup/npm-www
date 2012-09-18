var touch = require('touch')
var spawn = require('child_process').spawn

// flow control is fun!
function queue () {
  var args = [].slice.call(arguments)
  var cb = args.pop()
  go(args.shift())
  function go (fn) {
    if (!fn) return cb()
    fn(function (er) {
      if (er) return cb(er)
      go(args.shift())
    })
  }
}

var children = []
function exec (cmd, args, wait, cb) {
  if (typeof wait === 'function') cb = wait, wait = 200
  var opts = {stdio:'inherit'}
  // windows is kind of a jerk sometimes.
  if (process.platform === 'win32') {
    args = ['/c', '"' + cmd + '"'].concat(args)
    cmd = 'cmd'
    opts.windowsVerbatimArguments = true
  }
  var child = spawn(cmd, args, opts)
  var called = false

  var timer = setTimeout(function () {
    called = true
    cb()
  }, wait)

  child.on('exit', function (code) {
    if (wait) return cb(code)
    clearTimeout(timer)
    if (code) {
      msg = cmd + ' ' + args.join(' ') + ' fell over: '+code
      console.error(msg)
      if (!called) cb(new Error(msg))
    }
  })
  children.push(child)
}

queue(function (cb) {
  // first, make sure that we have the databases, or replicate will fail
  touch('dev/couch/registry.couch', cb)

}, function (cb) {
  touch('dev/couch/public_users.couch', cb)

}, function (cb) {
  touch('dev/couch/downloads.couch', cb)

}, function (cb) {
  // spawn couchdb, and make sure it stays up for a little bit
  exec('couchdb', ['-a', 'dev/couch/couch.ini'], cb)

}, function (cb) {
  // do the same for redis.
  exec('redis-server', ['dev/redis/redis.conf'], cb)

}, function (cb) {
  // give it a few seconds to download some interesting data.
  // otherwise the site is pretty empty.
  exec(process.execPath, [require.resolve('./replicate.js')], 5000, cb)

}, function (er) {
  if (er) throw er

  console.error('\n\n\nSTARTING DEV SITE NOW\n\n\n')

  // force the configs to be pointed at our local redis and couchdb.
  var config = {}
  config.couchAuth = 'admin:admin'
  config.registryCouch = 'http://localhost:15984/'
  config.registryCouch = 'http://localhost:15984/'
  config.redis = { host: '127.0.0.1', port: 16379 }
  config.redisAuth = 'i-am-using-redis-in-development-mode-for-npm-www'
  config.keys = ['these keys are for dev mode only']

  // TODO:
  // set expots.mailTransPortType and exports.mailTransportSettings
  // so that it'll send email using the localhost's sendmail, maybe?

  // fakey fake SSL certs for convenience.
  var fs = require('fs')
  config.https = {
    ca: [],
    key: fs.readFileSync(require.resolve('./ssl/server.key'), 'utf8'),
    cert: fs.readFileSync(require.resolve('./ssl/server.crt'), 'utf8')
  }

  config.port = 15443
  config.host = 'localhost'
  config.httpPort = 15080

  config.npm = config.npm || {
    registry: 'http://127.0.0.1:15984/',
    'strict-ssl': false,
    loglevel: 'warn',
    username: '',
    _password: '',
    _auth: '',
    _token: ''
  }

  config.debug = true

  // write to the dev admin config.
  fs.writeFileSync('config.dev.js',
                   'module.exports = ' + JSON.stringify(config, null, 2),
                   'utf8')

  process.env.NODE_ENV = 'dev'
  process.env.CLUSTER_MASTER_REPL = 15337

  // now we've replicated everything, and set up the configs,
  // and it worked, so start up the master http server.
  require('../server.js')
})
