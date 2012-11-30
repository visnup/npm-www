// XXX Maybe split route handlers into separate modules?
// Could do some kind of fs.readdir and then require them all.

var routes = require('routes')
, Router = routes.Router
, Route = routes.Route
, router = new Router()
, config = require('./config.js')


module.exports = router

// static stuff serves out of the static folder.
var static = require('./routes/static.js')
router.addRoute('/static/*?', static)
router.addRoute('/favicon.ico', static)
router.addRoute('/install.sh', static)
router.addRoute('/ca.crt', static)
router.addRoute('/api/*?', static)
router.addRoute('/api', static)
// st should really just let you do either index.html OR autoindex
router.addRoute('/doc/?', function (req, res) {
  req.url = require('url').parse(req.url).pathname
  if (!req.url.match(/\/$/)) return res.redirect(req.url+'/')
  req.url += 'index.html'
  static(req, res)
})
router.addRoute('/doc/*', static)

router.addRoute('/stylus/*?', require('./routes/stylus.js'))
// legacy
router.addRoute('/dist/*?', distRedirect)
router.addRoute('/dist', distRedirect)
function distRedirect (req, res) {
  var s = req.splats && req.splats[0] || ''
  return res.redirect('http://nodejs.org/dist/npm/' + s, 301)
}

router.addRoute('/search', require('./routes/search.js'))

router.addRoute('/login', require('./routes/login.js'))

router.addRoute('/profile-edit', require('./routes/profile-edit.js'))
router.addRoute('/profile/:name', profRedir)
router.addRoute('/profile', profRedir)
router.addRoute('/~/:name', profRedir)
function profRedir (req, res) {
  var n = req.params && req.params.name || ''
  res.redirect('/~' + n, 301)
}
router.addRoute('/~:name', require('./routes/profile.js'))
router.addRoute('/~', require('./routes/profile.js'))


router.addRoute('/session', require('./routes/session-dump.js'))
var logout = require('./routes/logout.js')
router.addRoute('/logout', logout)
router.addRoute('/logout/*?', logout)
router.addRoute('/password', require('./routes/password.js'))
router.addRoute('/signup', require('./routes/signup.js'))

var forgot = require('./routes/forgot-password.js')
router.addRoute('/forgot', forgot)
router.addRoute('/forgot/:token', forgot)

router.addRoute('/about', require('./routes/about.js'))

router.addRoute('/', require('./routes/index.js'))

// The package details page
var packagePage = require('./routes/package-page.js')
router.addRoute('/package/:name/:version', packagePage)
router.addRoute('/package/:name', packagePage)

router.addRoute('/keyword/:kw', function (q, s) {
  return s.redirect('/browse/keyword/' + q.params.kw, 301)
})

router.addRoute('/browse/*?', require('./routes/browse.js'))

var ra = require('./routes/recentauthors.js') 
router.addRoute('/recent-authors', ra)
router.addRoute('/recent-authors/*?', ra)

// npmjs.org/npm -> npmjs.org/package/npm
// if nothing else matches.
router.addRoute('/:name', require('./routes/maybe-package.js'))
