var Node = require('../../src/nodes/Node');

console.log(new Node(document.getElementById('1')));

console.log('----一个节点-----');
Node.iterate(
    new Node(document.getElementById('1')),
    new Node(document.getElementById('1')),
    function (node) {
        console.log(node);
    }
);
console.log('----/一个节点-----');

console.log('----多个节点-----');
Node.iterate(
    new Node(document.getElementById('1')),
    new Node(document.getElementById('4')),
    function (node) {
        console.log(node);
    }
);
console.log('----/多个节点-----');

console.log('----中途跳出-----');
Node.iterate(
    new Node(document.getElementById('1')),
    new Node(document.getElementById('4')),
    function (node) {
        console.log(node);
        if (node.getNodeType() === Node.ELEMENT_NODE
            && node.getAttribute('id') === '4'
        ) {
            return true;
        }
    }
);
console.log('----/中途跳出-----');

console.log('----返回节点-----');
Node.iterate(
    new Node(document.getElementById('1')),
    new Node(document.getElementById('4')),
    function (node) {
        if (node.getNodeType === Node.ELEMENT_NODE && node.getAttribute('id') === '4') {
            return true;
        }
    }
);
console.log('----/返回节点-----');
