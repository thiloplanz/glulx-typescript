var gulp = require('gulp');
var typescript = require('gulp-tsc');
var replace = require('gulp-replace');

gulp.task('default', function() {
    return gulp
        .src(['core/*.ts','mersenne-twister.ts','example/node/*.*'])
        .pipe(replace('../mersenne-twister.ts', 'mersenne-twister.ts'))
        .pipe(replace('../../core/', ''))
        .pipe(replace('../../node','../node'))
        .pipe(gulp.dest('dist'))
});

gulp.task('tsc', function(){
    gulp.src(['dist/*.ts'])
        .pipe(typescript())
        .pipe(gulp.dest('dist/js'))
});

gulp.task('compile', ['default', 'tsc']);
