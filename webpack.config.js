module.exports = {
    entry: {
        'nodes/node.js': './test/nodes/node.js',
        'ifdirective/ifdirective.js': './test/ifdirective/ifdirective.js',
        'expr/expr.js': './test/expr/expr.js'
    },
    output: {
        path: __dirname,
        filename: './dist/[name]'
    }
};
