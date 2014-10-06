gulp = require 'gulp'
source = require 'vinyl-source-stream'
coffeeify = require 'coffeeify'
browserify = require 'browserify'
gutil = require 'gulp-util'
coffee = require 'gulp-coffee'

gulp.task 'browserify', ->
  browserify('./src/yayson.coffee', {extensions: ['.coffee']})
    .transform(coffeeify)
    .bundle()
    .pipe(source('yayson.js'))
    .pipe(gulp.dest('./dist/'))

gulp.task 'build', ->
  gulp.src('./src/**/*.coffee')
    .pipe(coffee({bare: true}).on('error', gutil.log))
    .pipe(gulp.dest('./lib/'))

gulp.task 'default', ['browserify', 'build']
