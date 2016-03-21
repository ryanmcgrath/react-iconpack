var gulp = require('gulp'),
    fs = require('fs'),
    browserify = require('browserify'),
    iconpacker = require('react-iconpack')('browserify');


var compile = function() {
    var bundler = browserify('./browserify-test/src/index.js', {
        debug: true,
    });
    
    iconpacker.attachBrowserifyInjector(bundler, {
        verbose: true
    });
    
    bundler.require('react').require('react-dom').transform('babelify', {
        presets: ['es2015', 'react'],
        plugins: ['react-iconpack']
    });

    bundler.bundle()
        .on('error', function(err) {
            console.error('Failure! ' + err);
            this.emit('end');
        })
        .pipe(fs.createWriteStream('./browserify-test/dist/build.js'));
};


gulp.task('compile', compile);
gulp.task('default', ['compile']);
