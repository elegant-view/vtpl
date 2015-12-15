var Vtpl = require('../../src/main');
var vtpl = new Vtpl({
    startNode: document.getElementById('main'),
    endNode: document.getElementById('main')
});

vtpl.render();

setInterval(function () {
    vtpl.$tree.rootScope.set('name', new Date().getTime());
}, 1000);
