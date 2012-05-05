The new npmjs.org website.

## Visual specs:

* http://chrisglass.com/work/npm/specs/
* http://chrisglass.com/work/npm/

## Design Philosophy:

* No frameworks

    Everything is done using small, simple, standalone modules that work
    with vanilla Node.js http servers.

* No lib folder

    If you would put it in `lib/`, then it belongs in a separate module.

* JavaScript, EJS, and Stylus

    We are using JavaScript because that is the language Node.js runs.

    We are using EJS for templating, because that is the template
    language that is closest to HTML.

    We are using Stylus for styling, because CSS is intolerable, and
    stylus is a reasonable superset that adds useful features in a way
    that makes it very clear what the resulting CSS will be.

* Showcase new Node.js Features

    You'll note that many of the dependencies require Node.js 0.7.8 and
    higher.  That's because we're using new cluster features to take
    advantage of multiple CPUs, and the new domains feature to handle
    errors gracefully.

* Ridiculous speed

    This site should be surprisingly fast.  Towards that end, things are
    cached and served from memory whenever possible, and ETagged for
    browser-cacheablility.

* No Single-Page App Insanity, Push-State, Sammy, Etc.

    This is a documentation site.  It should primarily function by
    talking to a database and returning HTML.  It's not an application.

    By returning HTML, we get a lot of benefits for free.  Some
    client-side JavaScript may be added later to smooth out rough edges,
    but first, it must all work with client-side JavaScript disabled.
    It's not that we expect any users to have JavaScript disabled, but
    rather that this discipline forces a consistent approach to the site
    structure.

* Beauty

    The goal of this site is to be so beautiful, that people want to
    publish their programs to npm just to be a part of it.  The design
    of the site must be elegant.  Colors, fonts, and spacing must be
    humane, consistent, and make relevant information clear.

* Security

    User data is sacred.  This site must be a step up in terms of
    security from just doing things on the command line.  If it's not,
    then we have failed.

* Unceremonious MVC

    No big MVC class heirarchy.  Just have the route handler get some
    data, then hand it off to a template.  Simpler is better.

* Small Modules

    No single JavaScript file should be more than about 200 lines.  If
    it is, then that's a sign that it should be split up.

* DRY Dependencies

    If multiple different routes all have to keep doing the same thing,
    then they should either be the same route, or the repeated bits
    belong in a dependency.

* Check in node_modules

    Every time you add a dependency, check it into git.  This is a
    deployed website.  We need to keep things predictable.

* No Binary Dependencies

    There is no need.  We are proxying data to redis and couchdb.  It's
    all JSON and HTML.  Node can do that just fine without compiling
    anything.

* Search using Search Engines

    While we may end up integrating some kind of search into the site
    directly, it's more likely that we'll go with Bing or DuckDuckGo or
    Google.  There are advantages to an integrated search, but no matter
    how nice we may make it, people will always go to their default
    search engines to try to find node modules.  We must optimize for
    that use case first, and then build up from there.

    This is another reason why a plain-jane HTML site is best.  Search
    engines are awesome at searching it.

## Contributing

Contributions welcome!  If you are going to take on some huge part of
the site, please post an issue first to discuss the direction.  Beyond
that, just fork and send pull requests, as is the custom of our time.
