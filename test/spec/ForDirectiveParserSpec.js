/**
 * @file ForDirectiveParserSpec
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import NodesManager from 'src/nodes/NodesManager';
import DomUpdater from 'src/DomUpdater';
import ExprCalculater from 'src/ExprCalculater';
import ScopeModel from 'src/ScopeModel';
import ExprWatcher from 'src/ExprWatcher';
import ForDirectiveParser from 'src/parsers/ForDirectiveParser';
import Config from 'src/Config';
import ExprParser from 'src/parsers/ExprParser';
import IfDirectiveParser from 'src/parsers/IfDirectiveParser';

describe('ForDirectiveParser', () => {

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
                else if (name === 'nodesManager') {
                    return nodesManager;
                }
                else if (name === 'parserClasses') {
                    return [ExprParser, IfDirectiveParser];
                }
                else if (name === 'exprCalculater') {
                    return exprCalculater;
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

    describe('isProperNode static method', () => {
        // for指令的开始节点必须是注释节点，并且该注释节点第一块不为空的字符串是`for:`
        it('should identfy the `for` start node', () => {
            const {nodesManager} = createAssists();
            let node = nodesManager.getNode(document.createComment('for: list as item'));
            expect(ForDirectiveParser.isProperNode(node, new Config())).toBe(true);

            node = nodesManager.getNode(document.createComment(' for:'));
            expect(ForDirectiveParser.isProperNode(node, new Config())).toBe(true);

            node = nodesManager.getNode(document.createComment('\n for:'));
            expect(ForDirectiveParser.isProperNode(node, new Config())).toBe(true);

            node = nodesManager.getNode(document.createComment('for list as'));
            expect(ForDirectiveParser.isProperNode(node, new Config())).toBe(false);

            node = nodesManager.getNode(document.createComment('for :'));
            expect(ForDirectiveParser.isProperNode(node, new Config())).toBe(false);

            node = nodesManager.getNode(document.createComment(': list as'));
            expect(ForDirectiveParser.isProperNode(node, new Config())).toBe(false);
        });
    });

    describe('isEndNode static method', () => {
        it('should identify the `for` end node', () => {
            const {nodesManager} = createAssists();
            let node = nodesManager.getNode(document.createComment('/for'));
            expect(ForDirectiveParser.isEndNode(node, new Config())).toBe(true);

            node = nodesManager.getNode(document.createComment(' /for '));
            expect(ForDirectiveParser.isEndNode(node, new Config())).toBe(true);

            node = nodesManager.getNode(document.createComment('\n /for \n'));
            expect(ForDirectiveParser.isEndNode(node, new Config())).toBe(true);

            node = nodesManager.getNode(document.createComment('\n /for \n...'));
            expect(ForDirectiveParser.isEndNode(node, new Config())).toBe(false);

            node = nodesManager.getNode(document.createComment('for'));
            expect(ForDirectiveParser.isEndNode(node, new Config())).toBe(false);
        });
    });

    describe('findEndNode static method', () => {
        it('should find the `for` end directive', () => {
            const assists = createAssists();
            const {nodesManager} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- for: list as item -->',
                '<div></div>',
                '<!-- /for -->'
            ].join('');

            expect(ForDirectiveParser.findEndNode(
                nodesManager.getNode(rootNode.firstChild), new Config()
            )).toBe(
                nodesManager.getNode(rootNode.lastChild)
            );
        });

        it('should not find the `for` end directive if the start directive is not the end directive\'s brother', () => {
            const assists = createAssists();
            const {nodesManager} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- for: list as item -->',
                '<div></div><p>',
                '<!-- /for -->',
                '</p>'
            ].join('');

            expect(ForDirectiveParser.findEndNode(
                nodesManager.getNode(rootNode.firstChild), new Config()
            )).toBe(
                undefined
            );
        });
    });

    describe('collectExprs method', () => {
        it('should not collect `for` expression when the is no content between `for` start directive and end directive',
            () => {
                const assists = createAssists();
                const {tree, nodesManager} = assists;

                const rootNode = document.createElement('div');
                rootNode.innerHTML = [
                    '<!-- for: list as item -->',
                    '<!-- /for -->'
                ].join('');
                const forDirectiveParser = new ForDirectiveParser({
                    tree,
                    startNode: nodesManager.getNode(rootNode.firstChild),
                    endNode: nodesManager.getNode(rootNode.lastChild)
                });

                forDirectiveParser.collectExprs();

                expect(forDirectiveParser.expressions.length).toBe(0);

                setTimeout(() => destroyAssists(assists), 1000);
            }
        );

        it('should collect `for` expression', () => {
            const assists = createAssists();
            const {tree, nodesManager} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- for: list as item -->',
                ' ',
                '<!-- /for -->'
            ].join('');
            const forDirectiveParser = new ForDirectiveParser({
                tree,
                startNode: nodesManager.getNode(rootNode.firstChild),
                endNode: nodesManager.getNode(rootNode.lastChild)
            });

            forDirectiveParser.collectExprs();

            expect(forDirectiveParser.expressions.length).toBe(1);
            expect(forDirectiveParser.expressions[0]).toBe('{list}');

            setTimeout(() => destroyAssists(assists), 1000);
        });

        it('should throw error if the expression is not correct', () => {
            const assists = createAssists();
            const {tree, nodesManager} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- for: list as -->',
                ' ',
                '<!-- /for -->'
            ].join('');
            const forDirectiveParser = new ForDirectiveParser({
                tree,
                startNode: nodesManager.getNode(rootNode.firstChild),
                endNode: nodesManager.getNode(rootNode.lastChild)
            });

            expect(() => forDirectiveParser.collectExprs()).toThrow(new Error('wrong for expression: list as'));

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });

    describe('initRender method', () => {
        it('should initialize DOM', done => {
            const assists = createAssists();
            const {tree, nodesManager, scopeModel, domUpdater} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- for: list as item -->',
                '{item}',
                '<!-- /for -->'
            ].join('');
            const forDirectiveParser = new ForDirectiveParser({
                tree,
                startNode: nodesManager.getNode(rootNode.firstChild),
                endNode: nodesManager.getNode(rootNode.lastChild)
            });

            forDirectiveParser.collectExprs();
            scopeModel.set('list', ['yibuyisheng']);
            domUpdater.start();
            forDirectiveParser.initRender(() => {
                expect(rootNode.innerText).toBe('yibuyisheng');
                done();
            });

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });

    describe('onExpressionChange method', () => {
        it('should change DOM when data changed', done => {
            const assists = createAssists();
            const {tree, nodesManager, scopeModel, domUpdater, exprWatcher} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- for: list as item -->',
                '{item}',
                '<!-- /for -->'
            ].join('');
            const forDirectiveParser = new ForDirectiveParser({
                tree,
                startNode: nodesManager.getNode(rootNode.firstChild),
                endNode: nodesManager.getNode(rootNode.lastChild)
            });

            forDirectiveParser.collectExprs();
            domUpdater.start();
            exprWatcher.start();

            forDirectiveParser.initRender();
            exprWatcher.on('change', (event, done) => forDirectiveParser.onExpressionChange(event, done));
            scopeModel.set('list', ['yibuyisheng'], false, () => {
                expect(rootNode.innerText).toBe('yibuyisheng');
                done();
            });

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });

    describe('hide and show method', () => {
        it('should not change DOM after hiding', done => {
            const assists = createAssists();
            const {tree, nodesManager, scopeModel, domUpdater, exprWatcher} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- for: list as item -->',
                '{item}',
                '<!-- /for -->'
            ].join('');
            const forDirectiveParser = new ForDirectiveParser({
                tree,
                startNode: nodesManager.getNode(rootNode.firstChild),
                endNode: nodesManager.getNode(rootNode.lastChild)
            });

            forDirectiveParser.collectExprs();
            domUpdater.start();
            exprWatcher.start();

            forDirectiveParser.initRender();
            exprWatcher.on('change', (event, done) => forDirectiveParser.onExpressionChange(event, done));
            forDirectiveParser.goDark();
            scopeModel.set('list', ['yibuyisheng'], false, () => {
                expect(rootNode.innerText).toBe('');
                done();
            });

            setTimeout(() => destroyAssists(assists), 1000);
        });

        it('should change DOM after showing', done => {
            const assists = createAssists();
            const {tree, nodesManager, scopeModel, domUpdater, exprWatcher} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- for: list as item -->',
                '{item}',
                '<!-- /for -->'
            ].join('');
            const forDirectiveParser = new ForDirectiveParser({
                tree,
                startNode: nodesManager.getNode(rootNode.firstChild),
                endNode: nodesManager.getNode(rootNode.lastChild)
            });

            forDirectiveParser.collectExprs();
            domUpdater.start();
            exprWatcher.start();

            forDirectiveParser.initRender();
            exprWatcher.on('change', (event, done) => forDirectiveParser.onExpressionChange(event, done));
            forDirectiveParser.goDark();
            scopeModel.set('list', ['yibuyisheng'], false, () => {
                expect(rootNode.innerText).toBe('');

                forDirectiveParser.restoreFromDark(() => {
                    expect(rootNode.innerText).toBe('yibuyisheng');
                    done();
                });
            });

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });

    describe('nest if directive', () => {
        it('should show yibuyisheng', done => {
            const assists = createAssists();
            const {tree, nodesManager, scopeModel, domUpdater, exprWatcher} = assists;

            const rootNode = document.createElement('div');
            rootNode.innerHTML = [
                '<!-- for: list as item -->',
                    '<!-- if: item === \'yibuyisheng\' -->',
                        'yibuyisheng',
                    '<!-- else -->',
                        '===',
                    '<!-- /if -->',
                '<!-- /for -->'
            ].join('');
            const forDirectiveParser = new ForDirectiveParser({
                tree,
                startNode: nodesManager.getNode(rootNode.firstChild),
                endNode: nodesManager.getNode(rootNode.lastChild)
            });

            forDirectiveParser.collectExprs();
            domUpdater.start();
            exprWatcher.start();

            forDirectiveParser.initRender();
            exprWatcher.on('change', (event, done) => forDirectiveParser.onExpressionChange(event, done));
            scopeModel.set('list', ['yibuyisheng'], false, () => {
                expect(rootNode.innerText).toBe('yibuyisheng');
                done();
            });

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });
});
