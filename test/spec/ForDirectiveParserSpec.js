import Vtpl from 'vtpl';

describe('ForDirectiveParser', () => {
    let node;

    beforeEach(() => {
        node = document.createElement('div');
    });

    it('simple list', done => {
        node.innerHTML = '<!-- for: students as student -->${student.name}<!-- /for -->';

        let tpl = new Vtpl({startNode: node, endNode: node});
        tpl.render();

        tpl.setData({students: [
            {
                name: 'yibuyisheng1'
            },
            {
                name: 'yibuyisheng2'
            }
        ]}, {
            done() {
                expect(node.textContent.replace(/\s*/g, '')).toBe('yibuyisheng1yibuyisheng2');

                tpl.setData({students: [
                    {
                        name: 'yibuyisheng3'
                    }
                ]}, {
                    done() {
                        expect(node.textContent.replace(/\s*/g, '')).toBe('yibuyisheng3');
                        done();
                    }
                });
            }
        });
    });

    it('simple object', done => {
        node.innerHTML = '<!-- for: student as value -->${key}-${value},<!-- /for -->';

        let tpl = new Vtpl({startNode: node, endNode: node});
        tpl.render();

        tpl.setData({
            student: {
                name: 'yibuyisheng',
                age: 30,
                company: 'Baidu'
            }
        }, {
            done() {
                // TODO: 顺序可能不是这样的。。。。暂时写成这样
                expect(node.textContent.replace(/\s*/g, '')).toBe('name-yibuyisheng,age-30,company-Baidu,');
                done();
            }
        });
    });

    it('nest', done => {
        node.innerHTML = `
            <!-- for: students as student -->
                $\{student.name}
                <!-- for: student as value -->
                    $\{key}-$\{value}
                <!-- /for -->
            <!-- /for -->
        `;

        let tpl = new Vtpl({startNode: node, endNode: node});
        tpl.render();

        tpl.setData({
            students: [{
                name: 'yibuyisheng',
                age: 30,
                company: 'Baidu'
            }]
        }, {
            done() {
                // TODO: Object打印顺序问题
                expect(node.textContent.replace(/\s*/g, '')).toBe('yibuyishengname-yibuyishengage-30company-Baidu');
                done();
            }
        });
    });

    it('`for` and `if` nest', done => {
        node.innerHTML = `
            <!-- for: students as student -->
                <!-- if: student.name === 'yibuyisheng' -->
                    yibuyisheng
                    <!-- if: student.age === 10 -->
                        10 years old
                    <!-- elif: student.age === 18 -->
                        18 years old
                    <!-- else -->
                        other ages
                    <!-- /if -->
                <!-- else -->
                    not yibuyisheng
                    <!-- if: student.age === 1 -->
                        1 years old
                    <!-- elif: student.age === 2 -->
                        2 years old
                    <!-- /if -->
                <!-- /if -->
            <!-- /for -->
        `;

        let tpl = new Vtpl({startNode: node, endNode: node});
        tpl.render();

        tpl.setData({
            students: [
                {
                    name: 'yibuyisheng',
                    age: 18
                },
                {
                    name: 'yibuyisheng',
                    age: 10
                },
                {
                    name: 'yibuyisheng1',
                    age: 3
                },
                {
                    name: 'yibuyisheng1',
                    age: 2
                }
            ]
        }, {
            done() {
                expect(node.textContent.replace(/\s*/g, '')).toBe('yibuyisheng18yearsoldyibuyisheng10yearsoldnotyibuyishengnotyibuyisheng2yearsold');

                tpl.setData('students', [
                    {
                        name: 'yibuyisheng',
                        age: 18
                    },
                    {
                        name: 'yibuyisheng1',
                        age: 2
                    }
                ], {
                    done() {
                        expect(node.textContent.replace(/\s*/g, '')).toBe('yibuyisheng18yearsoldnotyibuyisheng2yearsold');
                        done();
                    }
                });
            }
        });
    });
});
