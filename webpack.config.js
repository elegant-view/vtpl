module.exports = {
    entry: {
        'main.js': './src/main.js'//,
        // 'nodes/node.js': './test/nodes/node.js',
        // 'ifdirective/ifdirective.js': './test/ifdirective/ifdirective.js',
        // 'fordirective/fordirective.js': './test/fordirective/fordirective.js',
        // 'expr/expr.js': './test/expr/expr.js'
    },
    output: {
        path: __dirname,
        filename: './dist/[name]'
    }
};
