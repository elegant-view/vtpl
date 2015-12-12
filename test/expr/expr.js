var vtpl = require('../../src/main');
var Node = require('../../src/nodes/Node');

var mainNode = new Node(document.getElementById('main'));
var tree = vtpl.render({
    startNode: mainNode,
    endNode: mainNode
});

tree.traverse();

setInterval(function () {
    tree.rootScope.set('name', new Date().getTime());
}, 1000);
