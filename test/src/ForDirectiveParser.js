require(['/dist/main'], function (main) {
    var Config = main.Config;
    var Tree = main.Tree;

    describe('ForDirectiveParser', function () {
        var config;
        var testNode;

        beforeAll(function () {
            testNode = document.getElementById('test');
            config = new Config();
        });

        afterEach(function () {
            testNode.innerHTML = '';
        });

        it('${students} as ${student}', function (done) {
            testNode.innerHTML = [
                '<!-- for: ${students} as ${student} -->',
                    '<p>${student.name}，${student.age}</p>',
                '<!-- /for -->'
            ].join('');

            var cacheNode;

            var tree = createTree(testNode);
            tree.setData({
                students: [
                    {
                        name: '张三',
                        age: 21
                    },
                    {
                        name: '李四',
                        age: 22
                    },
                    {
                        name: '王五',
                        age: 23
                    }
                ]
            }, function () {
                expect(testNode.childNodes.length).toBe(5);
                expect(testNode.childNodes[1].innerText).toEqual('张三，21');
                expect(testNode.childNodes[2].innerText).toEqual('李四，22');
                expect(testNode.childNodes[3].innerText).toEqual('王五，23');
                cacheNode = testNode.childNodes[1];

                tree.setData({students: null}, function () {
                    expect(testNode.childNodes.length).toBe(5);
                    expect(testNode.childNodes[1].style.display).toBe('none');
                    expect(testNode.childNodes[2].style.display).toBe('none');
                    expect(testNode.childNodes[3].style.display).toBe('none');
                    expect(testNode.childNodes[1]).toBe(cacheNode);

                    tree.setData({
                        students: [
                            {
                                name: '张三',
                                age: 21
                            },
                            {
                                name: '李四',
                                age: 22
                            }
                        ]
                    }, function () {
                        expect(testNode.childNodes.length).toBe(5);
                        expect(testNode.childNodes[1].innerText).toEqual('张三，21');
                        expect(testNode.childNodes[2].innerText).toEqual('李四，22');
                        expect(testNode.childNodes[3].style.display).toBe('none');
                        expect(testNode.childNodes[1]).toBe(cacheNode);

                        done();
                    });
                });
            });
        });

        it('${students} as ${student}, ${index}, ${key}', function (done) {
            testNode.innerHTML = [
                '<!-- for: ${students} as ${student} -->',
                    '<p>${student.name}，${student.age}，${index}，${key}</p>',
                '<!-- /for -->'
            ].join('');

            var tree = createTree(testNode);
            tree.setData({
                students: [
                    {
                        name: '张三',
                        age: 21
                    }
                ]
            }, function () {
                expect(testNode.childNodes.length).toBe(3);
                expect(testNode.childNodes[1].innerText).toEqual('张三，21，0，0');

                tree.setData({
                    students: {
                        '张三': {
                            name: '张三',
                            age: 21
                        },
                        '李四': {
                            name: '李四',
                            age: 22
                        }
                    }
                }, function () {
                    expect(testNode.childNodes.length).toBe(4);
                    expect(testNode.childNodes[1].innerText).toEqual('张三，21，0，张三');
                    expect(testNode.childNodes[2].innerText).toEqual('李四，22，1，李四');
                    done();
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
