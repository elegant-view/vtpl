/**
 * @file IfDirectiveParserSpec
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import ScopeModel from 'src/ScopeModel';
import NodesManager from 'src/nodes/NodesManager';
import DomUpdater from 'src/DomUpdater';
import ExprWatcher from 'src/ExprWatcher';
import ExprCalculater from 'src/ExprCalculater';
import IfDirectiveParser from 'src/parsers/IfDirectiveParser';
import Config from 'src/Config';
import ExprParser from 'src/parsers/ExprParser';

describe('IfDirectiveParser', () => {

    function createAssists() {
        let tree;
        let nodesManager;
        let domUpdater;
        let exprWatcher;
        let scopeModel;
        let exprCalculater;
        let config;

        nodesManager = new NodesManager();

        scopeModel = new ScopeModel();
        domUpdater = new DomUpdater();
        exprCalculater = new ExprCalculater();
        exprWatcher = new ExprWatcher(scopeModel, exprCalculater);
        config = new Config();

        tree = {
            getTreeVar(name) {
                if (name === 'domUpdater') {
                    return domUpdater;
                }
                else if (name === 'config') {
                    return config;
                }
                else if (name === 'parserClasses') {
                    return [ExprParser];
                }
            },
            getExprWatcher() {
                return exprWatcher;
            },
            rootScope: scopeModel
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

    describe('isProperNode method', () => {
        it('should identify if start node', () => {
            const assists = createAssists();
            const {nodesManager} = assists;

            let domNode = nodesManager.getNode(document.createComment('if: a'));
            expect(IfDirectiveParser.isProperNode(domNode, new Config())).toBe(true);

            domNode = nodesManager.getNode(document.createComment('if'));
            expect(IfDirectiveParser.isProperNode(domNode, new Config())).toBe(false);

            domNode = nodesManager.getNode(document.createComment('\n if: a\n b '));
            expect(IfDirectiveParser.isProperNode(domNode, new Config())).toBe(true);

            domNode = nodesManager.getNode(document.createElement('div'));
            expect(IfDirectiveParser.isProperNode(domNode, new Config())).toBe(false);

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });

    describe('isEndNode method', () => {
        it('should identify the if end node', () => {
            const assists = createAssists();
            const {nodesManager} = assists;

            let domNode = nodesManager.getNode(document.createComment('/if'));
            expect(IfDirectiveParser.isEndNode(domNode, new Config())).toBe(true);

            domNode = nodesManager.getNode(document.createElement('div'));
            expect(IfDirectiveParser.isEndNode(domNode, new Config())).toBe(false);

            domNode = nodesManager.getNode(document.createComment('\n /if \n'));
            expect(IfDirectiveParser.isEndNode(domNode, new Config())).toBe(true);

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });

    describe('findEndNode method', () => {
        it('should find if directive end node', () => {
            const assists = createAssists();
            const {nodesManager} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- if: a -->',
                '<div></div>',
                '<!-- /if -->'
            ].join('');

            expect(IfDirectiveParser.findEndNode(
                nodesManager.getNode(rootNode.firstChild), new Config()
            )).toBe(
                nodesManager.getNode(rootNode.lastChild)
            );

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });

    describe('collectExprs method', () => {
        it('should collect if directive expression', () => {
            const assists = createAssists();
            const {nodesManager, tree} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- if: a -->',
                '<div></div>',
                '<!-- /if -->'
            ].join('');

            const ifDirectiveParser = new IfDirectiveParser({
                tree,
                startNode: nodesManager.getNode(rootNode.firstChild),
                endNode: nodesManager.getNode(rootNode.lastChild)
            });

            ifDirectiveParser.collectExprs();

            expect(ifDirectiveParser.expressions.length).toBe(1);
            expect(ifDirectiveParser.expressions[0]).toBe('${a}');

            setTimeout(() => destroyAssists(assists), 1000);
        });

        it('should handle multiple line expression', () => {
            const assists = createAssists();
            const {nodesManager, tree} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- if: a - \nb \n-->',
                '<div></div>',
                '<!-- /if -->'
            ].join('');

            const ifDirectiveParser = new IfDirectiveParser({
                tree,
                startNode: nodesManager.getNode(rootNode.firstChild),
                endNode: nodesManager.getNode(rootNode.lastChild)
            });

            ifDirectiveParser.collectExprs();

            expect(ifDirectiveParser.expressions.length).toBe(1);
            expect(ifDirectiveParser.expressions[0]).toBe('${a -  b}');

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });

    describe('initRender method', () => {
        it('should show the name `yibuyisheng` in if branch', done => {
            const assists = createAssists();
            const {nodesManager, tree, scopeModel, domUpdater} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- if: show -->',
                    'yibuyisheng',
                '<!-- /if -->'
            ].join('');

            const ifDirectiveParser = new IfDirectiveParser({
                tree,
                startNode: nodesManager.getNode(rootNode.firstChild),
                endNode: nodesManager.getNode(rootNode.lastChild)
            });

            ifDirectiveParser.collectExprs();
            ifDirectiveParser.linkScope();
            scopeModel.set('show', 1);
            domUpdater.start();
            ifDirectiveParser.initRender(() => {
                expect(rootNode.innerText).toBe('yibuyisheng');
                done();
            });

            setTimeout(() => destroyAssists(assists), 1000);
        });

        it('should hide the name `yibuyisheng` in if branch', done => {
            const assists = createAssists();
            const {nodesManager, tree, scopeModel, domUpdater} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- if: show -->',
                    'yibuyisheng',
                '<!-- /if -->'
            ].join('');

            const ifDirectiveParser = new IfDirectiveParser({
                tree,
                startNode: nodesManager.getNode(rootNode.firstChild),
                endNode: nodesManager.getNode(rootNode.lastChild)
            });

            ifDirectiveParser.collectExprs();
            ifDirectiveParser.linkScope();
            scopeModel.set('show', 0);
            domUpdater.start();

            ifDirectiveParser.initRender(() => {
                expect(rootNode.innerText).toBe('');
                done();
            });

            setTimeout(() => destroyAssists(assists), 1000);
        });

        it('should show the name `yibuyisheng` in elif branch', done => {
            const assists = createAssists();
            const {nodesManager, tree, scopeModel, domUpdater} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- if: a -->',
                    'yibuyisheng1',
                '<!-- elif: show -->',
                    'yibuyisheng',
                '<!-- /if -->'
            ].join('');

            const ifDirectiveParser = new IfDirectiveParser({
                tree,
                startNode: nodesManager.getNode(rootNode.firstChild),
                endNode: nodesManager.getNode(rootNode.lastChild)
            });

            ifDirectiveParser.collectExprs();
            ifDirectiveParser.linkScope();
            scopeModel.set('show', 1);
            domUpdater.start();

            ifDirectiveParser.initRender(() => {
                expect(rootNode.innerText).toBe('yibuyisheng');
                done();
            });

            setTimeout(() => destroyAssists(assists), 1000);
        });

        it('should show the name `yibuyisheng` in else branch', done => {
            const assists = createAssists();
            const {nodesManager, tree, scopeModel, domUpdater} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- if: a -->',
                    'yibuyisheng1',
                '<!-- else -->',
                    'yibuyisheng',
                '<!-- /if -->'
            ].join('');

            const ifDirectiveParser = new IfDirectiveParser({
                tree,
                startNode: nodesManager.getNode(rootNode.firstChild),
                endNode: nodesManager.getNode(rootNode.lastChild)
            });

            ifDirectiveParser.collectExprs();
            ifDirectiveParser.linkScope();
            scopeModel.set('show', 1);
            domUpdater.start();

            ifDirectiveParser.initRender(() => {
                expect(rootNode.innerText).toBe('yibuyisheng');
                done();
            });

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });

    describe('onExpressionChange method', () => {
        it('should show name `yibuyisheng`', done => {
            const assists = createAssists();
            const {nodesManager, tree, scopeModel, domUpdater, exprWatcher} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- if: a -->',
                    'yibuyisheng1',
                '<!-- else -->',
                    'yibuyisheng',
                '<!-- /if -->'
            ].join('');

            const ifDirectiveParser = new IfDirectiveParser({
                tree,
                startNode: nodesManager.getNode(rootNode.firstChild),
                endNode: nodesManager.getNode(rootNode.lastChild)
            });

            ifDirectiveParser.collectExprs();
            ifDirectiveParser.linkScope();
            domUpdater.start();
            exprWatcher.start();

            exprWatcher.on('change', (event, done) => {
                ifDirectiveParser.onExpressionChange(event, done);
            });

            ifDirectiveParser.initRender(() => {
                scopeModel.set('show', true, false, () => {
                    expect(rootNode.innerText).toBe('yibuyisheng');
                    done();
                });
            });

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });


    // let node;
    //
    // beforeEach(() => {
    //     node = document.createElement('div');
    // });
    //
    // it('single branch', done => {
    //     node.innerHTML = '<!-- if: name === "yibuyisheng" -->yes<!-- /if -->';
    //
    //     let tpl = new Vtpl({startNode: node, endNode: node});
    //     tpl.render(() => {
    //         expect(node.textContent).toBe('');
    //
    //         tpl.setData('name', 'yibuyisheng', {
    //             done() {
    //                 expect(node.textContent).toBe('yes');
    //                 tpl.destroy();
    //                 done();
    //             }
    //         });
    //     });
    // });
    //
    // it('`else` branch', done => {
    //     node.innerHTML = '<!-- if: name === "yibuyisheng" -->yes<!-- else -->no<!-- /if -->';
    //
    //     let tpl = new Vtpl({startNode: node, endNode: node});
    //     tpl.render();
    //
    //     tpl.setData('name', 'yibuyisheng', {
    //         done() {
    //             expect(node.textContent).toBe('yes');
    //
    //             tpl.setData('name', null, {
    //                 done() {
    //                     expect(node.textContent).toBe('no');
    //                     tpl.destroy();
    //                     done();
    //                 }
    //             });
    //         }
    //     });
    // });
    //
    // it('`elif` branch', done => {
    //     node.innerHTML = `
    //         <!-- if: name === "yibuyisheng" -->
    //             yibuyisheng
    //         <!-- elif: name === "yibuyisheng1" -->
    //             yibuyisheng1
    //         <!-- elif: name === "yibuyisheng2" -->
    //             yibuyisheng2
    //         <!-- else -->
    //             unknown
    //         <!-- /if -->
    //     `;
    //
    //     let tpl = new Vtpl({startNode: node, endNode: node});
    //     tpl.render();
    //
    //     tpl.setData('name', 'yibuyisheng', {
    //         done() {
    //             expect(node.textContent.replace(/\s*/g, '')).toBe('yibuyisheng');
    //
    //             tpl.setData('name', 'yibuyisheng1', {
    //                 done() {
    //                     expect(node.textContent.replace(/\s*/g, '')).toBe('yibuyisheng1');
    //
    //                     tpl.setData('name', 'yibuyisheng2', {
    //                         done() {
    //                             expect(node.textContent.replace(/\s*/g, '')).toBe('yibuyisheng2');
    //
    //                             tpl.setData('name', 'yibuyisheng3', {
    //                                 done() {
    //                                     expect(node.textContent.replace(/\s*/g, '')).toBe('unknown');
    //
    //                                     tpl.destroy();
    //                                     done();
    //                                 }
    //                             });
    //
    //                         }
    //                     });
    //                 }
    //             });
    //         }
    //     });
    // });
    //
    // it('nest', done => {
    //     node.innerHTML = `
    //         <!-- if: name === "yibuyisheng1" -->
    //             yibuyisheng1
    //         <!-- else -->
    //             not yibuyisheng1
    //             <!-- if: name === "yibuyisheng2" -->
    //                 yibuyisheng2
    //             <!-- else -->
    //                 not yibuyisheng2
    //             <!-- /if -->
    //         <!-- /if -->
    //     `;
    //
    //     let tpl = new Vtpl({startNode: node, endNode: node});
    //     tpl.render();
    //
    //     tpl.setData({name: 'yibuyisheng1'}, {
    //         done() {
    //             expect(node.textContent.replace(/\s*/g, '')).toBe('yibuyisheng1');
    //
    //             tpl.setData({name: 'yibuyisheng2'}, {
    //                 done() {
    //                     expect(node.textContent.replace(/\s*/g, '')).toBe('notyibuyisheng1yibuyisheng2');
    //
    //                     tpl.setData({name: 'yibuyisheng3'}, {
    //                         done() {
    //                             expect(node.textContent.replace(/\s*/g, '')).toBe('notyibuyisheng1notyibuyisheng2');
    //                             tpl.destroy();
    //                             done();
    //                         }
    //                     });
    //                 }
    //             });
    //         }
    //     });
    // });
    //
    // it('`if` `for` nest', done => {
    //     node.innerHTML = [
    //         '<!-- if: type === 1 -->',
    //             '1',
    //             '<!-- for: items as item -->',
    //                 '${item}',
    //             '<!-- /for -->',
    //         '<!-- elif: type === 2 -->',
    //             '2',
    //             '<!-- for: items as item -->',
    //                 '${item}',
    //             '<!-- /for -->',
    //         '<!-- /if -->'
    //     ].join('');
    //
    //     let tpl = new Vtpl({startNode: node, endNode: node});
    //     tpl.render();
    //
    //     tpl.setData({
    //         type: 2,
    //         items: ['a', 'b']
    //     }, {
    //         done() {
    //             expect(node.textContent).toBe('2ab');
    //
    //             tpl.setData({
    //                 items: ['a', 'b', 'c']
    //             }, {
    //                 done() {
    //                     expect(node.textContent).toBe('2abc');
    //
    //                     tpl.setData({
    //                         type: 1
    //                     }, {
    //                         done() {
    //                             expect(node.textContent).toBe('1abc');
    //                             done();
    //                         }
    //                     });
    //                 }
    //             });
    //         }
    //     });
    // });
    //
    // it('`if` end node', done => {
    //     node.innerHTML = `
    //         <!-- if: type === 1 -->
    //             1
    //         <!-- else -->
    //             other
    //         <!-- /if -->
    //         <div><span>outside</span></div>
    //     `;
    //
    //     let tpl = new Vtpl({startNode: node, endNode: node});
    //     tpl.render();
    //
    //     tpl.setData({
    //         type: 1
    //     }, {
    //         done() {
    //             expect(node.textContent.replace(/\s/g, ''), '').toBe('1outside');
    //             done();
    //         }
    //     });
    // });

});
