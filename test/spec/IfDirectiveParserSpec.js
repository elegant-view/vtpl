import IfDirectiveParser from 'vtpl/src/parsers/IfDirectiveParser';
import NodesManager from 'vtpl/src/nodes/NodesManager';
import Tree from 'vtpl/src/trees/Tree';
import Config from 'vtpl/src/Config';
import ExprCalculater from 'vtpl/src/ExprCalculater';
import DomUpdater from 'vtpl/src/DomUpdater';

export default function () {
    describe('IfDirectiveParser', () => {
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

        it('single branch', done => {
            node.setInnerHTML('<!-- if: name === "yibuyisheng" -->yes<!-- /if -->');
            let tree = new Tree({
                startNode: node,
                endNode: node
            });
            tree.setTreeVar('nodesManager', nodesManager);
            tree.setTreeVar('config', config);
            tree.setTreeVar('exprCalculater', exprCalculater);
            tree.setTreeVar('domUpdater', domUpdater);
            tree.compile();
            tree.link();

            setTimeout(() => {
                expect(node.$node.innerText).toBe('');

                tree.rootScope.set('name', 'yibuyisheng');
                setTimeout(() => {
                    expect(node.$node.innerText).toBe('yes');
                    tree.destroy();
                    done();
                }, 70);
            }, 70);
        });

        it('`else` branch', done => {
            node.setInnerHTML('<!-- if: name === "yibuyisheng" -->yes<!-- else -->no<!-- /if -->');
            let tree = new Tree({
                startNode: node,
                endNode: node
            });
            tree.setTreeVar('nodesManager', nodesManager);
            tree.setTreeVar('config', config);
            tree.setTreeVar('exprCalculater', exprCalculater);
            tree.setTreeVar('domUpdater', domUpdater);
            tree.compile();
            tree.rootScope.set('name', 'yibuyisheng');
            tree.link();
            setTimeout(() => {
                expect(node.$node.innerText).toBe('yes');

                tree.rootScope.set('name', null);
                setTimeout(() => {
                    expect(node.$node.innerText).toBe('no');
                    tree.destroy();
                    done();
                }, 70);
            }, 70);
        });

        it('`elif` branch', done => {
            node.setInnerHTML(`
                <!-- if: name === "yibuyisheng" -->
                    yibuyisheng
                <!-- elif: name === "yibuyisheng1" -->
                    yibuyisheng1
                <!-- elif: name === "yibuyisheng2" -->
                    yibuyisheng2
                <!-- else -->
                    unknown
                <!-- /if -->
            `);
            let tree = new Tree({startNode: node, endNode: node});
            tree.setTreeVar('nodesManager', nodesManager);
            tree.setTreeVar('config', config);
            tree.setTreeVar('exprCalculater', exprCalculater);
            tree.setTreeVar('domUpdater', domUpdater);
            tree.compile();
            tree.link();

            tree.rootScope.set('name', 'yibuyisheng');
            setTimeout(() => {
                expect(node.$node.innerText.replace(/\s*/g, '')).toBe('yibuyisheng');

                tree.rootScope.set('name', 'yibuyisheng1');
                setTimeout(() => {
                    expect(node.$node.innerText.replace(/\s*/g, '')).toBe('yibuyisheng1');

                    tree.rootScope.set('name', 'yibuyisheng2');
                    setTimeout(() => {
                        expect(node.$node.innerText.replace(/\s*/g, '')).toBe('yibuyisheng2');

                        tree.rootScope.set('name', 'yibuyisheng3');
                        setTimeout(() => {
                            expect(node.$node.innerText.replace(/\s*/g, '')).toBe('unknown');

                            tree.destroy();
                            done();
                        }, 70);
                    }, 70);
                }, 70);
            }, 70);
        });

        it('nest', done => {
            node.setInnerHTML(`
                <!-- if: name === "yibuyisheng1" -->
                    yibuyisheng1
                <!-- else -->
                    not yibuyisheng1
                    <!-- if: name === "yibuyisheng2" -->
                        yibuyisheng2
                    <!-- else -->
                        not yibuyisheng2
                    <!-- /if -->
                <!-- /if -->
            `);
            let tree = new Tree({startNode: node, endNode: node});
            tree.setTreeVar('nodesManager', nodesManager);
            tree.setTreeVar('config', config);
            tree.setTreeVar('exprCalculater', exprCalculater);
            tree.setTreeVar('domUpdater', domUpdater);
            tree.compile();
            tree.link();
            tree.rootScope.set({name: 'yibuyisheng1'});
            setTimeout(() => {
                expect(node.$node.innerText.replace(/\s*/g, '')).toBe('yibuyisheng1');

                tree.rootScope.set({name: 'yibuyisheng2'});
                setTimeout(() => {
                    expect(node.$node.innerText.replace(/\s*/g, '')).toBe('notyibuyisheng1yibuyisheng2');

                    tree.rootScope.set({name: 'yibuyisheng3'});
                    setTimeout(() => {
                        expect(node.$node.innerText.replace(/\s*/g, '')).toBe('notyibuyisheng1notyibuyisheng2');
                        tree.destroy();
                        done();
                    }, 70);
                }, 70);
            }, 70);
        });
    });
}
