describe('ExprParser', function () {
    var config;
    var testNode;

    beforeAll(function () {
        config = new Config();
        testNode = document.getElementById('test');
    });

    afterEach(function () {
        testNode.innerHTML = '';
    });

    it('${name}', function () {
        testNode.innerHTML = '${name}';

        var parser = createParser(testNode.firstChild);

        parser.setData({name: 'zhangsan'});
        expect(testNode.innerText).toEqual('zhangsan');

        parser.setData({});
        expect(testNode.innerText).toEqual('');

        parser.setData({name: '李四'});
        expect(testNode.innerText).toEqual('李四');
    });

    it('${student.name}', function () {
        testNode.innerText = '${student.name}';

        var parser = createParser(testNode.firstChild);

        parser.setData({student: {name: '张三'}});
        expect(testNode.innerText).toEqual('张三');

        parser.setData({student: null});
        expect(testNode.innerText).toEqual('');
    });

    it('${10 - num}', function () {
        testNode.innerHTML = '${10 - num}';

        var parser = createParser(testNode.firstChild);

        parser.setData({num: 8});
        expect(testNode.innerText).toEqual('2');

        parser.setData({num: 'aaa'});
        expect(testNode.innerText).toEqual('NaN');
    });

    it('${3-1}', function () {
        testNode.innerHTML = '${3-1}';

        var parser = createParser(testNode.firstChild);

        parser.setData({});
        expect(testNode.innerText).toEqual('2');
    });

    it('${getSex(sex)}', function () {
        testNode.innerHTML = '${getSex(sex)}';

        var parser = createParser(testNode.firstChild);

        var data = {
            getSex: function (sex) {
                if (sex === 1) {
                    return '男';
                }
                if (sex === 0) {
                    return '女';
                }
                return '未知性别';
            },
            sex: 1
        };

        parser.setData(data);
        expect(testNode.innerText).toEqual('男');

        data.sex = 0;
        parser.setData(data);
        expect(testNode.innerText).toEqual('女');

        data.sex = null;
        parser.setData(data);
        expect(testNode.innerText).toEqual('未知性别');
    });

    function createParser(node) {
        var parser = new ExprParser({
            node: node,
            config: config
        });
        parser.collectExprs();
        return parser;
    }
});