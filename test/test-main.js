require.config({
    baseUrl: '/base',
    callback: window.__karma__.start
});

require(['./test/utilsSpec']);
