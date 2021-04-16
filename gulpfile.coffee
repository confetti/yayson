gulp = require 'gulp'
source = require 'vinyl-source-stream'
coffeeify = require 'coffeeify'
browserify = require 'browserify'
gutil = require 'gulp-util'
coffee = require 'gulp-coffee'
http = require 'http'
ecstatic = require 'ecstatic'

serverport = 5005

gulp.task 'browserify', ->
  browserify('./src/yayson.coffee', {extensions: ['.coffee'], ignoreMissing: true, standalone: 'yayson'})
    .transform(coffeeify)
    .bundle()
    .pipe(source('yayson.js'))
    .pipe(gulp.dest('./dist/'))

gulp.task 'build', ->
  gulp.src('./src/**/*.coffee')
    .pipe(coffee({bare: true}).on('error', gutil.log))
    .pipe(gulp.dest('./lib/'))

gulp.task 'default', gulp.series('browserify', 'build')

gulp.task 'test-serve', ->
  http.createServer(ecstatic  root: __dirname + '/' ).listen(serverport)

  console.log "Listening on #{serverport}"

gulp.task 'test-coffee', ->
  browserify('./test/browser.coffee', {extensions: ['.coffee']})
    .transform(coffeeify)
    .bundle()
    .pipe(source('browser.js'))
    .pipe(gulp.dest('./test/.tmp/'))

gulp.task 'test-watch', ->
  gulp.watch('./src/**/*.coffee', {ignoreInitial: false}, gulp.series('test-coffee'))
  gulp.watch('./test/**/*.coffee', gulp.series('test-coffee'))


gulp.task 'test-browser', gulp.parallel('test-watch', 'test-serve')
