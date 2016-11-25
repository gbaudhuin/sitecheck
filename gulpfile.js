"use strict";

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var jsdoc = require('gulp-jsdoc3');
var istanbul = require('gulp-istanbul');
//var cover = require('gulp-coverage');
//var coveralls = require('gulp-coveralls');

gulp.task('lint', function () {
    return gulp.src('**/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
		.pipe(jshint.reporter('fail'));
});

gulp.task('test_old', function () {
    return gulp.src(['test/ut_*.js'], { read: false })
        .pipe(mocha({
            reporter: 'spec',
            globals: {
                // should: require('should')
            }
        }));
});

//gulp.task('coverage', function () {
//    return gulp.src(['ut/ut_*.js'], { read: false })
//        .pipe(cover.instrument({
//            pattern: ['**/src*']
//        }))
//        .pipe(mocha())
//        .pipe(cover.gather())
//        .pipe(cover.format())
//        .pipe(gulp.dest('reports'));
//});

gulp.task('pre-test', function () {
    return gulp.src(['src/**/*.js'])
        // Covering files
        .pipe(istanbul({ includeUntested: true }))
        // Use `require` statements to return covered files
        .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function () {
    return gulp.src(['test/*.js'])
        .pipe(mocha())
        // Creating the reports after tests ran
        .pipe(istanbul.writeReports())
        // Enforce a coverage of at least x%
        .pipe(istanbul.enforceThresholds({ thresholds: { global: 10 } }));
});

gulp.task('coveralls', function () {
    if (!process.env.CI) return;
    return gulp.src('./coverage/lcov.info')
        .pipe(coveralls());
});

gulp.task('doc', function (cb) {
    gulp.src(['README.md', './src/**/*.js'], { read: false })
        .pipe(jsdoc(cb));
});

gulp.task('default', ['lint']);