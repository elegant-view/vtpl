require(['/dist/main'], function (main) {
    var Config = main.Config;
    var Tree = main.Tree;

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

        it('${name}', function (done) {
            testNode.innerHTML = '${name}';

            var tree = createTree(testNode.firstChild);

            tree.setData({name: 'zhangsan'}, function () {
                expect(testNode.innerText).toEqual('zhangsan');

                tree.setData({name: ''}, function () {
                    expect(testNode.innerText).toEqual('');

                    tree.setData({name: '李四'}, function () {
                        expect(testNode.innerText).toEqual('李四');
                        done();
                    });
                });
            });
        });

        it('${student.name}', function (done) {
            testNode.innerText = '${student.name}';

            var tree = createTree(testNode.firstChild);

            tree.setData({student: {name: '张三'}}, function () {
                expect(testNode.innerText).toEqual('张三');

                tree.setData({student: null}, function () {
                    expect(testNode.innerText).toEqual('');
                    done();
                });
            });
        });

        it('${10 - num}', function (done) {
            testNode.innerHTML = '${10 - num}';

            var tree = createTree(testNode.firstChild);

            tree.setData({num: 8}, function () {
                expect(testNode.innerText).toEqual('2');

                tree.setData({num: 'aaa'}, function () {
                    expect(testNode.innerText).toEqual('NaN');
                    done();
                });
            });
        });

        it('${3-1}', function (done) {
            testNode.innerHTML = '${3-1}';

            var tree = createTree(testNode.firstChild);

            tree.setData({}, function () {
                expect(testNode.innerText).toEqual('2');
                done();
            });
        });

        it('${getSex(sex)}', function (done) {
            testNode.innerHTML = '${getSex(sex)}';

            var tree = createTree(testNode.firstChild);

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

            tree.setData(data, function () {
                expect(testNode.innerText).toEqual('男');

                data.sex = 0;
                tree.setData(data, function () {
                    expect(testNode.innerText).toEqual('女');

                    data.sex = null;
                    tree.setData(data, function () {
                        expect(testNode.innerText).toEqual('未知性别');

                        done();
                    });
                });
            });
        });

        function createTree(node) {
            var tree = new Tree({
                startNode: node,
                endNode: node,
                config: config
            });
            tree.traverse();
            return tree;
        }
    });
});
