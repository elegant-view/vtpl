var Tree = require('../../index');
var Config = require('../../src/config');

var tree = new Tree({
    startNode: document.getElementById('rootNode'),
    endNode: document.getElementById('rootNode'),
    config: new Config()
});

tree.traverse();
console.log(tree);

tree.setData({
    list: [
        {
            name: 'zhangsan'
        }
    ]
});

tree.setData({
    list: [
        {
            name: 'lisi'
        },
        {
            name: 'zhangsan'
        }
    ]
});

window.tree = tree;