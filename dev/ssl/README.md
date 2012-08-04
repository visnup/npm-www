If you are running the npm-www site on localhost, and you add the ca.crt
to your system's keychain, then it should show up as "valid" in your web
browser's chrome.

However, **please do not leave the ca.crt file in a trusted state on
your machine**, because the key is sitting here exposed, so any random
jerk on the internet can use it to sign anything they like!

The server.key and server.crt are used in dev mode.
