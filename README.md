Installation
============

`npm install` or `yarn install`

Configuration
=============

* Update 'package.json' config properties
* Update 'config.json'

Availabe tasks
==============

`gulp css`
* Compiles SASS to CSS
* Minifies CSS files
* Concats CSS files to one file

---

`gulp js`
* Concats JS file to one file
* Transpiles ES6

---

`gulp img`
* Optimizes images

---

`gulp lint`
* Performs static code analysis on JS files

---

`gulp watch`
* Watches JS files and SCSS files
* Runs `css` task and `js` task if a file changes

---

`gulp build`
* Runs `clean` task
* Runs `css` task
* Runs `js` task
* Runs `img` task

---

`gulp release --prerelease`

`gulp release --patch`

`gulp release --minor`

`gulp release --major`
* Bumps version in package.json file
* Runs `build` task
* Updates CHANGELOG.md file with git messages
* Creates git commit with message 'Bump Version' and tag e.g. 'v1.2.3'

Troubleshooting
===============

> Try to rebuild the jpegtran-bin package.

`npm rebuild jpegtran-bin`