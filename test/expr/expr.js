require('../../src/parsers/ExprParser');

var Tree = require('../../src/trees/Tree');
var Config = require('../../src/Config');
var Node = require('../../src/nodes/Node');

var mainNode = new Node(document.getElementById('main'));
var tree = new Tree({
    startNode: mainNode,
    endNode: mainNode,
    config: new Config()
});

tree.traverse();

setInterval(function () {
    tree.rootScope.set('name', new Date().getTime());
}, 1000);
