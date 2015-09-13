describe('IfDirectiveParser', function () {
    var config;
    var testNode;

    beforeAll(function () {
        testNode = document.getElementById('test');
        config = new Config();
    });

    afterEach(function () {
        testNode.innerHTML = '';
    });

    it('single branch', function () {
        testNode.innerHTML = [
            '<!-- if: ${age} > 18 -->',
                'show some content',
            '<!-- /if -->'
        ].join('');

        var parser = createParser(testNode);

        expect(parser.setData({age: 10})).toBeUndefined();
        expect(parser.setData({age: 20})).toBe(0);
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

        var parser = createParser(testNode);

        expect(parser.setData({age: 20, name: 'zhangsan'})).toBe(0);
        expect(parser.setData({})).toBe(2);
        expect(parser.setData({name: 'zhangsan'})).toBe(1);
    });

    function createParser(node) {
        var parser = new IfDirectiveParser({
            startNode: node.firstChild,
            endNode: node.lastChild,
            config: config,
            exprCalculater: new ExprCalculater()
        });
        parser.collectExprs();

        return parser;
    }
});
