var gulp = require('gulp');
var browserify = require('gulp-browserify');
var fs = require('fs');

gulp.task('createTestHtml', function () {
    var jsFiles = fs.readdirSync('./test/src');
    var testHtmlTpl = String(fs.readFileSync('./test/test.html.tpl'));
    jsFiles.forEach(function (jsFile) {
        var htmlFileContent = testHtmlTpl.replace('#js#', jsFile);
        var content = '';
        try {
            content = String(fs.readFileSync('./test/html/' + jsFile.slice(0, -3) + '.html'));
        }
        catch (e) {}
        htmlFileContent = htmlFileContent.replace('#html#', content);
        fs.writeFileSync('./test/dist/' + jsFile.slice(0, -3) + '.html', htmlFileContent);
    });
});

gulp.task('buildTestJs', function () {
    return gulp.src('./test/src/*.js')
        .pipe(browserify())
        .pipe(gulp.dest('./test/dist'));
});

gulp.task('build', function () {
    return gulp.src('./index.js')
        .pipe(browserify())
        .pipe(gulp.dest('./dist'));
});

gulp.task('watch', ['buildTestJs', 'createTestHtml'], function () {
    gulp.watch(['./**/*.js'], ['buildTestJs', 'createTestHtml']);
});
