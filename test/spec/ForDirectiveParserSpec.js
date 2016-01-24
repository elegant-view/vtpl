import ForDirectiveParser from 'vtpl/src/parsers/ForDirectiveParser';
import NodesManager from 'vtpl/src/nodes/NodesManager';
import Tree from 'vtpl/src/trees/Tree';
import Config from 'vtpl/src/Config';
import ExprCalculater from 'vtpl/src/ExprCalculater';
import DomUpdater from 'vtpl/src/DomUpdater';

export default function () {
    describe('ForDirectiveParser', () => {
        let nodesManager;
        let domUpdater;
        let node;
        let config = new Config();
        let exprCalculater;

        beforeEach(() => {
            nodesManager = new NodesManager();
            domUpdater = new DomUpdater();
            domUpdater.start();
            node = nodesManager.createElement('div');
            exprCalculater = new ExprCalculater();
        });

        afterEach(() => {
            nodesManager.destroy();
            domUpdater.destroy();
            exprCalculater.destroy();
            exprCalculater.destroy();
        });

        it('simple list', done => {
            node.setInnerHTML('<!-- for: students as student -->${student.name}<!-- /for -->');
            let tree = new Tree({startNode: node, endNode: node});
            setTreeVar(tree);
            tree.compile();
            tree.rootScope.set({students: [
                {
                    name: 'yibuyisheng1'
                },
                {
                    name: 'yibuyisheng2'
                }
            ]});
            tree.link();
            setTimeout(() => {
                expect(node.$node.innerText.replace(/\s*/g, '')).toBe('yibuyisheng1yibuyisheng2');

                tree.rootScope.set({students: [
                    {
                        name: 'yibuyisheng3'
                    }
                ]});
                setTimeout(() => {
                    expect(node.$node.innerText.replace(/\s*/g, '')).toBe('yibuyisheng3');
                    done();
                }, 70);
            }, 70);
        });

        it('simple object', done => {
            node.setInnerHTML('<!-- for: student as value -->${key}-${value},<!-- /for -->');
            let tree = new Tree({startNode: node, endNode: node});
            setTreeVar(tree);
            tree.compile();
            tree.link();
            tree.rootScope.set({
                student: {
                    name: 'yibuyisheng',
                    age: 30,
                    company: 'Baidu'
                }
            });
            setTimeout(() => {
                // TODO: 顺序可能不是这样的。。。。暂时写成这样
                expect(node.$node.innerText.replace(/\s*/g, '')).toBe('name-yibuyisheng,age-30,company-Baidu,');
                done();
            }, 70);
        });

        it('nest', done => {
            node.setInnerHTML(`
                <!-- for: students as student -->
                    $\{student.name}
                    <!-- for: student as value -->
                        $\{key}-$\{value}
                    <!-- /for -->
                <!-- /for -->
            `);
            let tree = new Tree({startNode: node, endNode: node});
            setTreeVar(tree);
            tree.compile();
            tree.link();
            tree.rootScope.set({
                students: [{
                    name: 'yibuyisheng',
                    age: 30,
                    company: 'Baidu'
                }]
            });
            setTimeout(() => {
                // TODO: Object打印顺序问题
                expect(node.$node.innerText.replace(/\s*/g, '')).toBe('yibuyishengname-yibuyishengage-30company-Baidu');
                done();
            }, 70);
        });

        function setTreeVar(tree) {
            tree.setTreeVar('nodesManager', nodesManager);
            tree.setTreeVar('config', config);
            tree.setTreeVar('exprCalculater', exprCalculater);
            tree.setTreeVar('domUpdater', domUpdater);
        }
    });
}
