var gulp = require('gulp');
var browserify = require('gulp-browserify');
var fs = require('fs');
var gutil = require('gulp-util');
var webserver = require('gulp-webserver');
var through = require('through2');

gulp.task('createTestHtml', function () {
    var jsFiles = fs.readdirSync('./test/src');
    var testHtmlTpl = String(fs.readFileSync('./test/test.html.tpl'));
    var indexHtmlContent = jsFiles.map(function (jsFile) {
        var rawJsFile = jsFile.slice(0, -3);
        var htmlFileContent = testHtmlTpl.replace('#js#', jsFile);
        var content = '';
        try {
            content = String(fs.readFileSync('./test/html/' + rawJsFile + '.html'));
        }
        catch (e) {}
        htmlFileContent = htmlFileContent.replace('#html#', content);
        fs.writeFileSync('./test/dist/' + rawJsFile + '.html', htmlFileContent);

        return '<a href="./' + rawJsFile + '.html' + '">' + rawJsFile + '</a>';
    }).join('<br>');
    fs.writeFileSync('./test/dist/index.html', indexHtmlContent);
});

gulp.task('buildTestJs', function () {
    return gulp.src('./test/src/*.js')
        .pipe(gulp.dest('./test/dist'));
});

gulp.task('buildSrc', function () {
    var jsFiles = fs.readdirSync('./src');
    jsFiles.forEach(function (jsFile) {
        fs.writeFileSync('./tmp/' + jsFile, [
            'window.' + jsFile.slice(0, -3),
            ' = ',
            'module.exports = ',
            'require(\'../src/' + jsFile + '\');'
        ].join(''));
    });

    return gulp.src(['./tmp/*.js'])
        .pipe(browserify({debug: true}))
        .on('error', function (error) {
            gutil.log(error);
        })
        .pipe(gulp.dest('./dist'));
});

gulp.task('static-server', function () {
    return gulp.src('./')
        .pipe(webserver({
            directoryListing: true,
            host: '0.0.0.0'
        }));
});

gulp.task('build', function () {
    return gulp.src(['./src/index.js'])
        .pipe(browserify({debug: true}))
        .on('error', function (error) {
            gutil.log(error);
        })
        .pipe(gulp.dest('./dist'));
});

gulp.task('watch', ['buildTestJs', 'buildSrc', 'createTestHtml', 'static-server'], function () {
    gulp.watch(['./src/**/*.js', './test/src/**/*.js', './test/html/**/*.html'], ['buildTestJs', 'buildSrc', 'createTestHtml']);
});
