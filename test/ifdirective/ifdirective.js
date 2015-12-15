var Vtpl = require('../../src/main');

var vtpl = new Vtpl({
    startNode: document.getElementById('main'),
    endNode: document.getElementById('main')
});

vtpl.render();

vtpl.$tree.rootScope.set({
    name: 'haha'
});

document.getElementById('destroy').addEventListener('click', function () {
    vtpl.destroy();
});

