require('../../src/parsers/IfDirectiveParser');

var vtpl = require('../../src/main');
var Node = require('../../src/nodes/Node');

var mainNode = new Node(document.getElementById('main'));
var tree = new vtpl.render({
    startNode: mainNode,
    endNode: mainNode
});

tree.traverse();
