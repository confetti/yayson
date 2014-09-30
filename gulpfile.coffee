gulp = require 'gulp'
source = require 'vinyl-source-stream'
coffeeify = require 'coffeeify'
browserify = require 'browserify'

gulp.task 'build', ->
  browserify('./src/yayson.coffee')
    .transform(coffeeify)
    .bundle()
    .pipe(source('yayson.js'))
    .pipe(gulp.dest('./lib/'))

gulp.task 'default', ['build']
