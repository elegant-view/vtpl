import Vtpl from '../src/main';

testForBase();
testForNest();
testIfBase();
testExprBase();
testEvent();
testIfNest();
testForIfNest();

function testForIfNest() {
    var vtpl = new Vtpl({
        startNode: getNode('forIfNest'),
        endNode: getNode('forIfNest')
    });

    vtpl.render();

    vtpl.setData({
        students: [
            {
                name: 'zhangsan',
                age: 18
            },
            {
                name: 'zhangsan',
                age: 19
            },
            {
                name: 'lisi',
                age: 18
            }
        ]
    });
}

function testIfNest() {
    var vtpl = new Vtpl({
        startNode: getNode('ifNest'),
        endNode: getNode('ifNest')
    });

    vtpl.render();

    vtpl.setData({
        name: 'lisi',
        age: 19
    });

    // vtpl.setData({
    //     name: 'zhangsan',
    //     age: 19
    // });
}

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

