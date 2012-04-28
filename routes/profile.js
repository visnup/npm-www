module.exports = profile

// thing for editing bits of your profile.
// gets saved back to couchdb.
function profile (req, res) {

  // The goal is to be able to edit a few fields on the user record,
  // and then display them in some nice way, along with some other
  // data bits, like what things the user starred, packages they
  // maintain, and so on.
  //
  // So, if we're trying to GET a user's record, we fetch it from
  // req.couch.get('/public_users/org.couchdb.user:'+name)
  //
  // If there is no user name provided, then we req.session.get('profile')
  // and pull the 'name' field out of it.  If we're not logged in, then
  // redirect to /login and req.session.set('done', req.url) so we come
  // back here.
  //
  // If the user name set is '_edit', then show the fields from
  // req.session.get('profile') that are editable, and a form for editing
  // them.  Put the _rev field in a hidden form field for convenience.
  // When the user POSTs to /profile/_edit, we update the user record
  // in couchdb with req.couch.put(...) and then redirect to /profile
  // again to view it.
  //
  // TODO:
  // 1. Figure out what fields we want to have there.  You don't
  // want to make _id, _rev, type, or date editable.  We
  // definitely don't want to expose password_sha or salt, but it
  // would be good to be able to change the password by entering the
  // old one and the new one twice, and generate a new salt and hash.
  //
  // 2. Make a pretty template to do it.  Use res.template('blah.ejs', data)
  // to have templar load up templates/blah.ejs with the data provided.
  //
  // Implementation should be fairly simple.  All the tools are already on
  // the req and res, and all the couch stuff is just pretty basic
  // callback-based stuff.

  res.send('not yet implemented', 404)
}
