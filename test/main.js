var Vtpl = require('../src/main');

testForBase();
testForNest();
testIfBase();
testExprBase();
testEvent();

function testEvent() {
    var vtpl = new Vtpl({
        startNode: getNode('event'),
        endNode: getNode('event')
    });

    vtpl.render();

    vtpl.setData({
        onClick(event) {
            alert('你点了按钮');
        }
    });
}

function testExprBase() {
    var vtpl = new Vtpl({
        startNode: getNode('exprBase'),
        endNode: getNode('exprBase')
    });

    vtpl.render();

    vtpl.setData({
        name: 'haha'
    });
}

function testIfBase() {
    var vtpl = new Vtpl({
        startNode: getNode('ifBase'),
        endNode: getNode('ifBase')
    });

    vtpl.render();

    vtpl.setData({
        name: 'haha'
    });
}

function testForNest() {
    var vtpl = new Vtpl({
        startNode: getNode('forNest'),
        endNode: getNode('forNest')
    });

    vtpl.render();
}

function testForBase() {
    var vtpl = new Vtpl({
        startNode: getNode('forBase'),
        endNode: getNode('forBase')
    });

    vtpl.render();
}

function getNode(id) {
    document.getElementById(id).style.display = 'block';
    return document.getElementById(id);
}

