require('../../src/parsers/IfDirectiveParser');

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
