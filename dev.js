var server = require('dev-server/lib/main');

server.start({
    rootPath: __dirname,
    port: 8001,
    babel: {
        include: [/\/(test|src)\/.*\.js$/]
    }
});
