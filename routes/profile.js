module.exports = function (req, res) {
  req.session.get("auth", function (er, data) {
    if (er) return res.error(er)
    res.sendJSON(data)
  })
}
