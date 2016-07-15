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
import DirectiveParser from 'src/parsers/DirectiveParser';

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
                    return [ExprParser, DirectiveParser];
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

    describe('nest', () => {
        it('should show `yibuyisheng 20`', done => {
            const assists = createAssists();
            const {nodesManager, tree, scopeModel, domUpdater, exprWatcher} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- if: showName -->',
                    'yibuyisheng',
                    '<!-- if: showAge -->',
                        ' 20',
                    '<!-- /if -->',
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
                scopeModel.set('showAge', true);
                scopeModel.set('showName', true, false, () => {
                    expect(rootNode.innerText).toBe('yibuyisheng 20');
                    done();
                });
            });

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });

});
