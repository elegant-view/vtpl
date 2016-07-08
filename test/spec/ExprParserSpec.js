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

        return {tree, nodesManager, domUpdater, exprWatcher, scopeModel, exprCalculater};
    }

    function destroyAssists(assists) {
        const {nodesManager, domUpdater, exprWatcher, scopeModel, exprCalculater} = assists;
        nodesManager.destroy();
        domUpdater.destroy();
        exprWatcher.destroy();
        scopeModel.destroy();
        exprCalculater.destroy();
    }

    describe('collectExprs method', () => {

        it('should collect nodeValue expression', () => {
            const assists = createAssists();
            const {tree, nodesManager} = assists;

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
            const {tree, nodesManager} = assists;

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

        it('should collect rest expressions', () => {
            const assists = createAssists();
            const {tree, nodesManager} = assists;

            const domNode = document.createElement('div');
            domNode.setAttribute('ev-rest', '${name}');
            const startNode = nodesManager.getNode(domNode);
            const endNode = nodesManager.getNode(domNode);
            const exprParser = new ExprParser({tree, startNode, endNode});

            exprParser.collectExprs();

            expect(exprParser.expressions.length).toBe(1);
            expect(exprParser.expressions[0]).toBe('${name}');

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });

    describe('initRender method', () => {
        it('should set the text node content to `yibuyisheng`', done => {
            const assists = createAssists();
            const {tree, nodesManager, scopeModel, domUpdater} = assists;

            const domNode = document.createTextNode('${name}');
            const startNode = nodesManager.getNode(domNode);
            const endNode = nodesManager.getNode(domNode);
            const exprParser = new ExprParser({tree, startNode, endNode});

            exprParser.collectExprs();
            scopeModel.set('name', 'yibuyisheng', true);
            exprParser.initRender(() => {
                expect(domNode.textContent).toBe('yibuyisheng');
                done();
            });
            domUpdater.start();
            expect(domNode.textContent).toBe('${name}');

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });

    describe('expression change', () => {
        it('should set the text node content to `yibuyisheng`', done => {
            const assists = createAssists();
            const {tree, nodesManager, scopeModel, domUpdater, exprWatcher} = assists;

            const domNode = document.createTextNode('${name}');
            const startNode = nodesManager.getNode(domNode);
            const endNode = nodesManager.getNode(domNode);
            const exprParser = new ExprParser({tree, startNode, endNode});

            exprParser.collectExprs();
            exprParser.initRender();
            domUpdater.start();

            exprWatcher.start();
            exprWatcher.on('change', (event, done) => {
                exprParser.onExpressionChange(event, done);
            });

            scopeModel.set('name', 'yibuyisheng', false, () => {
                expect(domNode.textContent).toBe('yibuyisheng');
                done();
            });
            expect(domNode.textContent).toBe('${name}');

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });

    describe('hide', () => {
        it('should hide the text node', done => {
            const assists = createAssists();
            const {tree, nodesManager, domUpdater, exprWatcher} = assists;

            const domNode = document.createTextNode('${name}');
            const startNode = nodesManager.getNode(domNode);
            const endNode = nodesManager.getNode(domNode);
            const exprParser = new ExprParser({tree, startNode, endNode});

            exprParser.collectExprs();
            exprParser.initRender();
            domUpdater.start();

            exprWatcher.start();
            exprWatcher.on('change', (event, done) => {
                exprParser.onExpressionChange(event, done);
            });

            exprParser.goDark(() => {
                expect(startNode.isHidden()).toBe(true);
                done();
            });
            expect(startNode.isHidden()).toBe(false);

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });

    describe('show', () => {
        it('should show the text node', done => {
            const assists = createAssists();
            const {tree, nodesManager, domUpdater, exprWatcher} = assists;

            const domNode = document.createTextNode('${name}');
            const startNode = nodesManager.getNode(domNode);
            const endNode = nodesManager.getNode(domNode);
            const exprParser = new ExprParser({tree, startNode, endNode});

            exprParser.collectExprs();
            exprParser.initRender();
            domUpdater.start();

            exprWatcher.start();
            exprWatcher.on('change', (event, done) => {
                exprParser.onExpressionChange(event, done);
            });

            exprParser.goDark(() => {
                expect(startNode.isHidden()).toBe(true);

                exprParser.restoreFromDark(() => {
                    expect(startNode.isHidden()).toBe(false);
                    done();
                });
            });
            expect(startNode.isHidden()).toBe(false);

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

    it('ev-rest', done => {
        let node = document.createElement('div');
        node.setAttribute('ev-rest', '${rest}');
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
});
