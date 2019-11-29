// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const gulp = require('gulp');
const source = require('vinyl-source-stream');
const coffeeify = require('coffeeify');
const browserify = require('browserify');
const gutil = require('gulp-util');
const coffee = require('gulp-coffee');
const http = require('http');
const ecstatic = require('ecstatic');

const serverport = 5005;

gulp.task('browserify', () => browserify('./src/yayson.coffee', {extensions: ['.coffee'], ignoreMissing: true, standalone: 'yayson'})
  .transform(coffeeify)
  .bundle()
  .pipe(source('yayson.js'))
  .pipe(gulp.dest('./dist/')));

gulp.task('build', () => gulp.src('./src/**/*.coffee')
  .pipe(coffee({bare: true}).on('error', gutil.log))
  .pipe(gulp.dest('./lib/')));

gulp.task('default', gulp.series('browserify', 'build'));

gulp.task('test-serve', function() {
  http.createServer(ecstatic({root: __dirname + '/'}) ).listen(serverport);

  return console.log(`Listening on ${serverport}`);
});

gulp.task('test-coffee', () => browserify('./test/browser.coffee', {extensions: ['.coffee']})
  .transform(coffeeify)
  .bundle()
  .pipe(source('browser.js'))
  .pipe(gulp.dest('./test/.tmp/')));

gulp.task('test-watch', function() {
  gulp.watch('./src/**/*.coffee', ['test-coffee']);
  return gulp.watch('./test/**/*.coffee', ['test-coffee']);
});


gulp.task('test-browser', gulp.series('test-watch', 'test-serve'));
