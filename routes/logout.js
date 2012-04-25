module.exports = function (req, res) {
  req.session.del("auth", function (er) {
    if (er) return res.error(er)
    // redirect somewhere?
    // check session.done?
    res.sendHTML("<html><body>you are logged out")
  })
}
