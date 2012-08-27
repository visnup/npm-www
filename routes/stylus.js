module.exports = styl

var st = require('st')
var mount = st(process.cwd())
var stylus = require("stylus")
var nib = require("nib")
var Stream = require('stream')

function styl (req, res) {
  req.url = req.url.replace(/\.css$/, '.styl')
  res.filter = new StylusStream()
  if (!mount(req, res)) return res.error(404)
  else res.setHeader('content-type', 'text/css')
}

function StylusStream () {
  Stream.apply(this)
  this.readable = this.writable = true
  this.buffer = []
}

StylusStream.prototype = Object.create(Stream.prototype, {
  constructor: { value: StylusStream }
})

StylusStream.prototype.write = function (c) {
  this.buffer.push(c)
  return true
}

StylusStream.prototype.end = function (c) {
  if (c) this.buffer.push(c)
  var b = Buffer.concat(this.buffer)
  render(b, function (er, css) {
    if (er) return this.emit('error', er)

    this.emit('data', new Buffer(css))
    this.emit('end')
  }.bind(this))
}

StylusStream.prototype.destroy = function () {}
StylusStream.prototype.close = function () {}

function render (s, cb) {
  stylus(s.toString()).use(nib()).render(cb)
}
