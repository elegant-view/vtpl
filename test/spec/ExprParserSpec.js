import ExprParser from 'vtpl/src/parsers/ExprParser';
import NodesManager from 'vtpl/src/nodes/NodesManager';
import DomUpdater from 'vtpl/src/DomUpdater';
import Config from 'vtpl/src/Config';
import ExprCalculater from 'vtpl/src/ExprCalculater';
import ScopeModel from 'vtpl/src/ScopeModel';

export default function () {
    describe('ExprParser', () => {
        let manager;
        let domUpdater;
        let config;
        let exprCalculater;
        beforeAll(() => {
            manager = new NodesManager();
            domUpdater = new DomUpdater();
            config = new Config();
            exprCalculater = new ExprCalculater();

            domUpdater.start();
        });
        afterAll(() => {
            manager.destroy();
            domUpdater.destroy();
            exprCalculater.destroy();
        });

        it('#collectExprs() for element node', done => {
            let node = manager.createElement('div');
            node.setAttribute('name', '${name}');
            let exprParser = new ExprParser({
                node,
                tree: {
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
                    }
                }
            });
            exprParser.collectExprs();
            expect(exprParser.exprFns['${name}']).not.toBeNull();

            let exprObj = exprParser.exprFns['${name}'];
            let exprValue = exprObj.exprFn({
                get(name) {
                    if ('name' === name) {
                        return 'yibuyisheng';
                    }
                }
            });
            expect(exprValue).toBe('yibuyisheng');
            expect(node.getAttribute('name')).toBe('${name}');
            exprObj.updateFns[0](exprValue, () => {
                expect(node.getAttribute('name')).toBe('yibuyisheng');
                done();
            });
        });

        it('#collectExprs() for text node', done => {
            let node = manager.getNode(document.createTextNode('${name}'));
            let exprParser = new ExprParser({
                node,
                tree: {
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
                    }
                }
            });
            exprParser.collectExprs();

            let exprObj = exprParser.exprFns['${name}'];
            let exprValue = exprObj.exprFn({
                get(name) {
                    return 'yibuyisheng';
                }
            });
            exprObj.updateFns[0](exprValue, () => {
                expect(node.getNodeValue()).toBe('yibuyisheng');
                done();
            });
        });

        it('#linkScope()', done => {
            let node = manager.getNode(document.createTextNode('${name}'));
            let rootScope = new ScopeModel();
            let exprParser = new ExprParser({
                node,
                tree: {
                    rootScope,
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
                    }
                }
            });
            exprParser.collectExprs();
            rootScope.set('name', 'yibuyisheng1');
            expect(node.getNodeValue()).toBe('${name}');
            exprParser.linkScope();
            setTimeout(() => {
                expect(node.getNodeValue()).toBe('yibuyisheng1');

                rootScope.set('name', 'yibuyisheng2');
                setTimeout(() => {
                    expect(node.getNodeValue()).toBe('yibuyisheng2');
                    done();
                }, 70);
            }, 70);
        });

        it('#goDark()', done => {
            let node = manager.getNode(document.createTextNode('${name}'));
            let rootScope = new ScopeModel();
            let exprParser = new ExprParser({
                node,
                tree: {
                    rootScope,
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
                    }
                }
            });
            exprParser.collectExprs();
            rootScope.set('name', 'yibuyisheng1');
            expect(node.getNodeValue()).toBe('${name}');
            exprParser.linkScope();
            setTimeout(() => {
                expect(node.getNodeValue()).toBe('yibuyisheng1');

                exprParser.goDark();
                setTimeout(() => {
                    rootScope.set('name', 'yibuyisheng2');

                    setTimeout(() => {
                        expect(node.getNodeValue()).toBe('');
                        exprParser.restoreFromDark();

                        setTimeout(() => {
                            expect(node.getNodeValue()).toBe('yibuyisheng1');

                            rootScope.set('name', 'yibuyisheng3');
                            setTimeout(() => {
                                expect(node.getNodeValue()).toBe('yibuyisheng3');
                                done();
                            }, 70);
                        }, 70);
                    }, 300);
                });
            }, 70);
        });
    });
}
