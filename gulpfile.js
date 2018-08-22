/* global process */

/* INCLUDES */
const config = require('./config.json');
let pkg = require('./package.json');

const _ = require('lodash');
const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const concat = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const header = require('gulp-header');
const dateFormat = require('dateformat');
const uglify = require('gulp-uglify');
const eslint = require('gulp-eslint');
const cleanCSS = require('gulp-clean-css');
const eslintFriendlyFormatter = require('eslint-friendly-formatter');
const babel = require('gulp-babel');
const imagemin = require('gulp-imagemin');
const del = require('del');
const prettyBytes = require('pretty-bytes');
const notifier = require('node-notifier');
const chalk = require('chalk');
const log = require('fancy-log');
const browserSync = require('browser-sync');
const bump = require('gulp-bump');
const conventionalChangelog = require('conventional-changelog');
const fileSystem = require('fs');
const git = require('gulp-git');

const banner = `
/**
 * File:     <%= file %>
 * Pkg:      <%= pkg.name %>
 * Version:  <%= pkg.version %>
 * Date:     <%= date %>
 * Time:     <%= time %>
 *
 * Author:   <%= pkg.author %>
 * Homepage: <%= pkg.homepage %>
 */

`;

/**
 * Clean destination directories
 */
gulp.task('clean', () => {

    const dirs = [
        `${config.css.dest.dir}/*`,
        `${config.js.dest.dir}/*`,
        `${config.img.dest.dir}/*`,
    ];

    // Delete all files in directories
    return del(dirs, {
        force: true,
    }).then((paths) => {
        if (paths.length < 1) {
            // Console message
            log(chalk.yellow(`No files deleted: ${dirs.join(', ')}`));
        } else {
            // Console message
            log(chalk.green(`${paths.length} files deleted: ${dirs.join(', ')}`));
        }
    });
});

/**
 * Compile SCSS to CSS
 * Minify CSS
 * Write Sourcemap file
 * Concat CSS to one file
 */
gulp.task('sass:min:concat', () => {

    if (_.isEmpty(config.scss.src.file)) {
        // Console message
        log(chalk.yellow('No SCSS files found'));

        // Exit
        return false;
    }

    // Reload package info
    delete require.cache[require.resolve('./package.json')];
    pkg = require('./package.json');

    return gulp.src(config.scss.src.file)
        // Init sourcemaps
        .pipe(sourcemaps.init())
        // Compile SCSS
        .pipe(sass().on('error', sass.logError))
        .on('end', () => {
            // Console message
            log(chalk.green('SCSS compiled to CSS'));
        })
        // Concat to one file
        .pipe(concat(config.css.dest.file))
        .on('end', () => {
            // Console message
            log(chalk.green('CSS combined to one file'));
        })
        // Prefix SCSS
        .pipe(autoprefixer({
            browsers: ['last 5 versions'],
            cascade: false,
        }))
        .on('end', () => {
            // Console message
            log(chalk.green('SCSS prefixed'));
        })
        // Minify CSS
        .pipe(cleanCSS({debug: true}, (details) => {
            const originalSize = prettyBytes(details.stats.originalSize);
            const minifiedSize = prettyBytes(details.stats.minifiedSize);
            const percent = (details.stats.efficiency * 100).toFixed(1);
            log(chalk.green(`CSS minified (${originalSize} → ${minifiedSize} saved ${percent}%)`));
        }))
        // Add Header with data from package.json
        .pipe(header(banner, {
            pkg: pkg,
            date: dateFormat(new Date(), config.format.date),
            time: dateFormat(new Date(), config.format.time),
            file: config.css.dest.file,
        }))
        // Write sourcemaps
        .pipe(sourcemaps.write('.', {
            includeContent: false,
        }))
        .on('end', () => {
            // Console message
            log(chalk.green(`CSS sourcemap written to ./${config.css.dest.dir}/${config.css.dest.file}.map`));
        })
        // Write CSS file
        .pipe(gulp.dest(`./${config.css.dest.dir}/`))
        // Make browersync reload CSS only!
        .pipe(browserSync.stream({
            match: '**/*.css',
        }))
        .on('end', () => {
            // Console message
            log(chalk.green(`CSS file written to ./${config.css.dest.dir}/${config.css.dest.file}`));
        })
        // Error
        .on('error', () => {
            // Console message
            log(chalk.red('sass:min:concat FAILED'));
        });
});


/**
 * Minify JS
 * Concat JS to one file
 */
gulp.task('concat:js:min', () => {

    const files = [].concat(config.js.src.vendor, config.js.src.files);

    if (files.length < 1) {
        // Console message
        log(chalk.yellow('No JS files found'));

        // Exit
        return false;
    }

    // Reload package info
    delete require.cache[require.resolve('./package.json')];
    pkg = require('./package.json');

    return gulp.src(files)
        // Init sourcemaps
        .pipe(sourcemaps.init())
        // Convert
        .pipe(babel({
            presets: ['env'],
            only: config.js.src.files,
        }))
        .on('end', () => {
            // Console message
            log(chalk.green('JS transpiled'));
        })
        // Concat to one file
        .pipe(concat(config.js.dest.file))
        .on('end', () => {
            // Console message
            log(chalk.green(`JS combined to one file (${files.join(', ')})`));
        })
        // Minify JS code
        .pipe(uglify())
        .on('end', () => {
            // Console message
            log(chalk.green('JS minified'));
        })
        // Add Header with data from package.json
        .pipe(header(banner, {
            pkg: pkg,
            date: dateFormat(new Date(), config.format.date),
            time: dateFormat(new Date(), config.format.time),
            file: config.js.dest.file,
        }))
        // Write sourcemaps
        .pipe(sourcemaps.write('.', {
            includeContent: false,
        }))
        .on('end', () => {
            // Console message
            log(chalk.green(`JS sourcemap written to ./${config.js.dest.dir}/${config.js.dest.file}.map`));
        })
        // Write JS file
        .pipe(gulp.dest(`./${config.js.dest.dir}/`))
        // Make browersync reload JS only!
        .pipe(browserSync.stream({
            match: '**/*.js',
        }))
        // Done
        .on('end', () => {
            // Console message
            log(chalk.green(`JS file written to ./${config.js.dest.dir}/${config.js.dest.file}`));
        })
        // Error
        .on('error', () => {
            // Console message
            log(chalk.red('concat:js:min FAILED'));
        });
});

/**
 * Minify images
 */
gulp.task('img:min', () => {

    return gulp.src(`${config.img.src.dir}/**`)
        .pipe(imagemin([
            imagemin.gifsicle({
                interlaced: false,
                optimizationLevel: 1,
            }),
            imagemin.jpegtran({
                // Lossless conversion to progressive.
                progressive: false,
            }),
            imagemin.optipng({
                // https://github.com/imagemin/imagemin-optipng#api
                optimizationLevel: 3,
            }),
            imagemin.svgo({
                plugins: [{removeViewBox: false}],
            }),
        ], {
            verbose: true,
        }))
        // Done
        .on('end', () => {
            // Console message
            log(chalk.green('Images optimized'));
        })
        .pipe(gulp.dest(config.img.dest.dir))
        // Done
        .on('end', () => {
            // Console message
            log(chalk.green(`Optimized images written to ./${config.img.dest.dir}`));
        })
        // Error
        .on('error', () => {
            // Console message
            log(chalk.red('img:min FAILED'));
        });
});

/**
 * Lint JS
 */
gulp.task('lint:js', () => {

    if (config.js.src.files.length < 1) {
        // Console message
        log(chalk.yellow('No JS files found'));

        // Exit
        return false;
    }

    return gulp.src(config.js.src.files)
        .pipe(eslint({
            configFile: 'eslintrc.js',
        }))
        .pipe(eslint.format(eslintFriendlyFormatter))
        .pipe(eslint.failAfterError())
        // Done
        .on('end', () => {
            // Console message
            log(chalk.green(`Linting JS files: ${config.js.src.files.join(', ')}`));
        })
        // Error
        .on('error', () => {
            // Console message
            log(chalk.red('lint:js FAILED'));
        });
});

/**
 * Watch tasks SCSS
 */
gulp.task('watch:scss', () => {

    // Console message
    log(chalk.green(`Watching ${config.scss.src.dir}/*.scss`));

    // Start watcher
    const watcher = gulp.watch(`${config.scss.src.dir}/*.scss`, ['sass:min:concat']);

    const sound = config.sound ? 'Ping' : false;

    watcher.on('change', (e) => {
        notifier.notify({
            title: `${pkg.name} ${pkg.version}`,
            subtitle: 'sass:min:concat',
            message: e.path,
            sound: sound,
        }, (err, response) => {
            // Response is response from notification
        });
    });
});

/**
 * Watch tasks JS
 */
gulp.task('watch:js', () => {

    // Console message
    log(chalk.green(`Watching ${config.js.src.files.join(', ')}`));

    // Start watcher
    const watcher = gulp.watch(config.js.src.files, ['concat:js:min']);

    const sound = config.sound ? 'Ping' : false;

    watcher.on('change', (e) => {
        notifier.notify({
            title: `${pkg.name} ${pkg.version}`,
            subtitle: 'concat:js:min',
            message: e.path,
            sound: sound,
        }, (err, response) => {
            // Response is response from notification
        });
    });
});

/**
 * Watch tasks SCSS and JS
 */
gulp.task('browser:sync', () => {
    browserSync.init(config.browserSync);
});

/**
 * Bump version
 *
 * @example
 * "gulp bump --prerelease" // 0.0.1-2
 * "gulp bump --patch"      // 0.0.2
 * "gulp bump --minor"      // 0.1.0
 * "gulp bump --major"      // 1.0.0
 */
gulp.task('bump', () => {

    const arg = process.argv[3] || '--patch';
    const type = arg.trim().replace(/^-+/, '');

    const packageFile = './package.json';

    return gulp.src(packageFile)
        .pipe(bump({
            type: type,
        }))
        .pipe(gulp.dest('./'))
        // Done
        .on('end', (response) => {
            // Console message
            log(chalk.green(`Package file updated: ${packageFile}`));
        });
});

/**
 * Create changelog
 */
gulp.task('changelog', () => {
    return conventionalChangelog({
        releaseCount: 0,
    })
        .pipe(fileSystem.createWriteStream('CHANGELOG.md'));
});

/**
 * Create Git commit
 */
gulp.task('git:commit', () => {
    return gulp.src('./')
        .pipe(git.commit('Bump Version'))
        // Done
        .on('end', () => {
            // Console message
            log(chalk.green('Version bumped'));
        })
        // Error
        .on('error', () => {
            // Console message
            log(chalk.red('git:commit FAILED'));
        });
});

/**
 * Create Git tag
 */
gulp.task('git:tag', (done) => {
    // Reload package info
    delete require.cache[require.resolve('./package.json')];
    pkg = require('./package.json');

    git.tag(`v${pkg.version}`, '', (err) => {
        if (err) {
            // Console message
            log(chalk.red('git:tag FAILED'));
        }
        // Console message
        log(chalk.green(`Tag git with: ${pkg.version}`));
        done();
    });
});

/**
 * Alias
 */
gulp.task('css', gulp.series('sass:min:concat'));

gulp.task('js', gulp.series('concat:js:min'));

gulp.task('img', gulp.series('img:min'));

gulp.task('lint', gulp.series('lint:js'));

/**
 * Watch task
 */
gulp.task('watch', gulp.series('watch:scss', 'watch:js'));

/**
 * Build task
 */
gulp.task('build', gulp.series('clean', 'concat:js:min', 'sass:min:concat', 'img:min'));

/**
 * Release task
 */
gulp.task('release', gulp.series('build', 'bump', 'git:commit', 'git:tag'));