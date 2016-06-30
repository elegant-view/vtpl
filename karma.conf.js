// Karma configuration
// Generated on Wed Jun 29 2016 23:22:24 GMT+0800 (CST)

module.exports = function(config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',


        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['jasmine', 'requirejs'],


        // list of files / patterns to load in the browser
        files: [
            'test/main.js',
            {
                pattern: 'src/**/*.js',
                included: false
            },
            {
                pattern: 'test/**/*Spec.js',
                included: false
            },
            {
                pattern: 'test/**/*Spec.js',
                included: false
            },
            {
                pattern: 'node_modules/protectobject/src/**/*.js',
                included: false
            },
            {
                pattern: 'node_modules/event/src/**/*.js',
                included: false
            },
            {
                pattern: 'node_modules/state/src/**/*.js',
                included: false
            }
        ],


        // list of files to exclude
        exclude: [],


        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            'src/**/*.js': ['babel'/*, 'coverage'*/],
            'test/**/!(main).js': ['babel'],
            'node_modules/protectobject/src/**/*.js': ['babel'],
            'node_modules/event/src/**/*.js': ['babel'],
            'node_modules/state/src/**/*.js': ['babel']
        },

        babelPreprocessor: {
            options: {
                presets: ['es2015', 'stage-0'],
                plugins: ['transform-decorators-legacy', 'transform-es2015-modules-amd']
            }
        },

        coverageReporter: {
            type: 'html',
            dir: 'coverage'
        },


        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['coverage', 'kjhtml'],


        // web server port
        port: 9876,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,


        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['Chrome', 'Firefox'],


        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: Infinity,

        browserNoActivityTimeout: 100000
    });
};
