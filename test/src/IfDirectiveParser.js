require(['/dist/main'], function (main) {
    var Config = main.Config;
    var Tree = main.Tree;

    describe('IfDirectiveParser', function () {
        var config;
        var testNode;

        beforeAll(function () {
            testNode = document.getElementById('test');
            config = new Config();
        });

        afterEach(function () {
            // testNode.innerHTML = '';
        });

        it('single branch', function () {
            testNode.innerHTML = [
                '<!-- if: ${age} > 18 -->',
                    'show some content',
                '<!-- /if -->'
            ].join('');

            var tree = createTree(testNode);

            tree.setData({age: 10});
            tree.setData({age: 20});

            // expect(tree.setData({age: 10})).toBeUndefined();
            // expect(tree.setData({age: 20})).toBe(0);
        });

        it('mutiple branches', function () {
            testNode.innerHTML = [
                '<!-- if: ${age} > 18 -->',
                    'gt 18',
                '<!-- elif: ${name} === "zhangsan" -->',
                    'zhangsan',
                '<!-- else -->',
                    'else',
                '<!-- /if -->'
            ].join('');

            var tree = createTree(testNode);

            tree.setData({age: 10, name: 'zhangsan'});

            // expect(tree.setData({age: 20, name: 'zhangsan'})).toBe(0);
            // expect(tree.setData({})).toBe(2);
            // expect(tree.setData({name: 'zhangsan'})).toBe(1);
        });

        function createTree(node) {
            var tree = new Tree({
                startNode: node.firstChild,
                endNode: node.lastChild,
                config: config
            });
            tree.traverse();

            return tree;
        }
    });
});
