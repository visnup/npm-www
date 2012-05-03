// XXX Maybe split route handlers into separate modules?
// Could do some kind of fs.readdir and then require them all.

var routes = require("routes")
, Router = routes.Router
, Route = routes.Route
, filed = require("filed")
, router = new Router()
, config = require("./config.js")


module.exports = router

// static stuff serves out of the static folder.
var static = require("./routes/static.js")
router.addRoute("/static/*?", static)
router.addRoute("/favicon.ico", static)
router.addRoute("/stylus/*?", require("./routes/stylus.js"))

router.addRoute("/login", require("./routes/login.js"))

router.addRoute("/profile/_edit", require("./routes/profile-edit.js"))
router.addRoute("/profile/:name", require("./routes/profile.js"))
router.addRoute("/profile", require("./routes/profile.js"))

router.addRoute("/session", require("./routes/session-dump.js"))
router.addRoute("/logout/*?", require("./routes/logout.js"))

router.addRoute("/about", require("./routes/about.js"))

// The package details page
// Definitely ought to be its own module.
var packagePage = require("./routes/package-page.js")
router.addRoute("/package/:name/:version", packagePage)
router.addRoute("/package/:name", packagePage)
