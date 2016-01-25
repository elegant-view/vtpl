import ExprParser from 'vtpl/src/parsers/ExprParser';
import NodesManager from 'vtpl/src/nodes/NodesManager';
import DomUpdater from 'vtpl/src/DomUpdater';
import Config from 'vtpl/src/Config';
import ExprCalculater from 'vtpl/src/ExprCalculater';
import ScopeModel from 'vtpl/src/ScopeModel';
import ExprWatcher from 'vtpl/src/ExprWatcher';

export default function () {
    describe('ExprParser', () => {
        let manager;
        let domUpdater;
        let config;
        let exprCalculater;
        let exprWatcher;
        let scopeModel;
        let mockTree;
        beforeEach(() => {
            manager = new NodesManager();
            domUpdater = new DomUpdater();
            config = new Config();
            exprCalculater = new ExprCalculater();
            scopeModel = new ScopeModel();
            exprWatcher = new ExprWatcher(scopeModel, exprCalculater);
            mockTree = {
                getTreeVar(src) {
                    if (src === 'domUpdater') {
                        return domUpdater;
                    }
                    if (src === 'config') {
                        return config;
                    }
                    if (src === 'exprCalculater') {
                        return exprCalculater;
                    }
                },
                getExprWatcher() {
                    return exprWatcher;
                },
                rootScope: scopeModel
            };

            domUpdater.start();
            exprWatcher.start();
        });
        afterEach(() => {
            manager.destroy();
            domUpdater.destroy();
            exprCalculater.destroy();
            exprWatcher.destroy();
        });

        it('element node', done => {
            let node = manager.createElement('div');
            node.setAttribute('name', '${name}');
            let exprParser = new ExprParser({
                node,
                tree: mockTree
            });

            exprParser.collectExprs();
            exprParser.linkScope();

            scopeModel.set('name', 'yibuyisheng');
            setTimeout(() => {
                expect(node.getAttribute('name')).toBe('yibuyisheng');
                done();
            }, 70);
        });

        it('text node', done => {
            let node = manager.getNode(document.createTextNode('${name}'));
            let exprParser = new ExprParser({
                node,
                tree: mockTree
            });

            exprParser.collectExprs();
            exprParser.linkScope();

            scopeModel.set('name', 'yibuyisheng');
            setTimeout(() => {
                expect(node.getNodeValue()).toBe('yibuyisheng');
                done();
            }, 70);
        });

        it('#goDark()', done => {
            let node = manager.getNode(document.createTextNode('${name}'));
            let exprParser = new ExprParser({
                node,
                tree: mockTree
            });

            exprParser.collectExprs();
            exprParser.linkScope();

            scopeModel.set('name', 'yibuyisheng');
            setTimeout(() => {
                expect(node.getNodeValue()).toBe('yibuyisheng');

                exprParser.goDark();
                setTimeout(() => {
                    scopeModel.set('name', 'yibuyisheng2');

                    setTimeout(() => {
                        expect(node.getNodeValue()).toBe('');
                        exprParser.restoreFromDark();

                        setTimeout(() => {
                            expect(node.getNodeValue()).toBe('yibuyisheng2');

                            scopeModel.set('name', 'yibuyisheng3');
                            setTimeout(() => {
                                expect(node.getNodeValue()).toBe('yibuyisheng3');
                                done();
                            }, 70);
                        }, 70);
                    }, 70);
                });
            }, 70);
        });

        it('refresh date', done => {
            let node = manager.getNode(document.createTextNode('${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}'));
            let exprParser = new ExprParser({
                node,
                tree: mockTree
            });
            exprParser.collectExprs();
            exprParser.linkScope();

            let dt = new Date();
            let now = new Date();
            scopeModel.set('dt', dt);
            setTimeout(() => {
                expect(node.getNodeValue()).toBe(`${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`);

                dt.setMonth(-1);
                now.setMonth(-1);
                scopeModel.set('dt', dt);
                setTimeout(() => {
                    expect(node.getNodeValue()).toBe(`${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`);
                    done();
                }, 70);
            }, 70);
        });
    });
}
