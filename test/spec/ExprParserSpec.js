/**
 * @file ExprParserSpec
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import NodesManager from 'src/nodes/NodesManager';
import DomUpdater from 'src/DomUpdater';
import ExprCalculater from 'src/ExprCalculater';
import ScopeModel from 'src/ScopeModel';
import ExprWatcher from 'src/ExprWatcher';
import Vtpl from 'src/main';
import ExprParser from 'src/parsers/ExprParser';

describe('ExprParser', () => {

    describe('collectExprs method', () => {
        function createAssists() {
            let tree;
            let nodesManager;
            let domUpdater;
            let exprWatcher;
            let scopeModel;
            let exprCalculater;

            nodesManager = new NodesManager();

            scopeModel = new ScopeModel();
            domUpdater = new DomUpdater();
            exprCalculater = new ExprCalculater();
            exprWatcher = new ExprWatcher(scopeModel, exprCalculater);

            tree = {
                getTreeVar(name) {
                    if (name === 'domUpdater') {
                        return domUpdater;
                    }
                },
                getExprWatcher() {
                    return exprWatcher;
                },
                scopeModel
            };

            return [tree, nodesManager, domUpdater, exprWatcher, scopeModel, exprCalculater];
        }

        function destroyAssists(assists) {
            const [, nodesManager, domUpdater, exprWatcher, scopeModel, exprCalculater] = assists;
            nodesManager.destroy();
            domUpdater.destroy();
            exprWatcher.destroy();
            scopeModel.destroy();
            exprCalculater.destroy();
        }

        it('should collect nodeValue expression', () => {
            const assists = createAssists();
            const [tree, nodesManager] = assists;

            const domNode = document.createTextNode('${name}');
            const startNode = nodesManager.getNode(domNode);
            const endNode = nodesManager.getNode(domNode);
            const exprParser = new ExprParser({tree, startNode, endNode});

            exprParser.collectExprs();

            expect(exprParser.expressions.length).toBe(1);
            expect(exprParser.expressions[0]).toBe('${name}');

            setTimeout(() => destroyAssists(assists), 1000);
        });

        it('should collect DOM element\'s attribute expressions', () => {
            const assists = createAssists();
            const [tree, nodesManager] = assists;

            const domNode = document.createElement('div');
            domNode.setAttribute('name', '${name}');
            const startNode = nodesManager.getNode(domNode);
            const endNode = nodesManager.getNode(domNode);
            const exprParser = new ExprParser({tree, startNode, endNode});

            exprParser.collectExprs();

            expect(exprParser.expressions.length).toBe(1);
            expect(exprParser.expressions[0]).toBe('${name}');

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });


    let manager;
    let domUpdater;
    let exprCalculater;
    let exprWatcher;
    let scopeModel;
    beforeEach(() => {
        manager = new NodesManager();
        domUpdater = new DomUpdater();
        exprCalculater = new ExprCalculater();
        scopeModel = new ScopeModel();
        exprWatcher = new ExprWatcher(scopeModel, exprCalculater);

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
        let node = document.createElement('div');
        node.setAttribute('name', '${name}');

        let tpl = new Vtpl({startNode: node, endNode: node});
        tpl.render();

        tpl.setData('name', 'yibuyisheng', {
            done() {
                expect(node.getAttribute('name')).toBe('yibuyisheng');
                done();
            }
        });
    });

    it('text node', done => {
        let node = document.createTextNode('${name}');

        let tpl = new Vtpl({startNode: node, endNode: node});
        tpl.render();

        tpl.setData('name', 'yibuyisheng', {
            done() {
                expect(node.nodeValue).toBe('yibuyisheng');
                done();
            }
        });
    });

    it('#goDark()', done => {
        let node = document.createTextNode('${name}');

        let tpl = new Vtpl({startNode: node, endNode: node});
        tpl.render();

        node = tpl.nodesManager.getNode(node);
        tpl.setData('name', 'yibuyisheng', {
            done() {
                expect(node.getNodeValue()).toBe('yibuyisheng');

                tpl.tree.goDark(() => {
                    tpl.setData('name', 'yibuyisheng2', {
                        done() {
                            expect(node.getNodeValue()).toBe('yibuyisheng');

                            tpl.tree.restoreFromDark(() => {
                                expect(node.getNodeValue()).toBe('yibuyisheng2');

                                tpl.setData('name', 'yibuyisheng3', {
                                    done() {
                                        expect(node.getNodeValue()).toBe('yibuyisheng3');
                                        done();
                                    }
                                });
                            });
                        }
                    });
                });
            }
        });
    });

    it('refresh date', done => {
        let node = document.createTextNode('${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}');

        let tpl = new Vtpl({startNode: node, endNode: node});
        tpl.render();

        let dt = new Date();
        let now = new Date();
        tpl.setData('dt', dt);
        node = tpl.nodesManager.getNode(node);
        setTimeout(() => {
            expect(node.getNodeValue()).toBe(`${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`);

            dt.setMonth(-1);
            now.setMonth(-1);
            tpl.setData('dt', dt);
            setTimeout(() => {
                expect(node.getNodeValue()).toBe(`${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`);
                done();
            }, 70);
        }, 70);
    });

    it('d-rest', done => {
        let node = document.createElement('div');
        node.setAttribute('d-rest', '${rest}');
        node.setAttribute('name', 'yibuyisheng1');
        node.setAttribute('in-school', 'school1');

        let tpl = new Vtpl({startNode: node, endNode: node});
        tpl.render();

        tpl.setData('rest', {
            name: 'yibuyisheng2',
            age: 20,
            inSchool: 'school2'
        });
        node = tpl.nodesManager.getNode(node);
        setTimeout(() => {
            expect(node.getAttribute('name')).toBe('yibuyisheng1');
            expect(node.getAttribute('age')).toBe('20');
            expect(node.getAttribute('in-school')).toBe('school1');
            done();
        }, 70);
    });

    // it('undefined expression', done => {
    //     let node = document.createElement('div');
    //     node.setAttribute('name', '${student.name}');

    //     let tpl = new Vtpl({startNode: node, endNode: node});
    //     tpl.render(() => {
    //         debugger
    //         expect(node.getAttribute('name')).toBe('');
    //         done();
    //     });
    // });

    it('replace by html', done => {
        let node = document.createElement('p');
        node.innerHTML = ' ${html} ';

        let tpl = new Vtpl({startNode: node, endNode: node});
        tpl.render();

        tpl.setData({
            html: {
                type: 'html',
                html: '<span></span><span></span>'
            }
        });
        setTimeout(() => {
            expect(node.innerHTML).toBe('<span></span><span></span>');

            tpl.setData({html: {type: 'html', html: '123'}});
            setTimeout(() => {
                expect(node.innerHTML).toBe('123');

                tpl.setData({
                    html: 'text'
                });
                setTimeout(() => {
                    expect(node.textContent).toBe('text');
                    done();
                }, 70);
            }, 70);
        }, 70);
    });
});
