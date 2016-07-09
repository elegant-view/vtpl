/**
 * @file ExprParserSpec
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import NodesManager from 'src/nodes/NodesManager';
import DomUpdater from 'src/DomUpdater';
import ExprCalculater from 'src/ExprCalculater';
import ScopeModel from 'src/ScopeModel';
import ExprWatcher from 'src/ExprWatcher';
import HTMLExprParser from 'src/parsers/HTMLExprParser';

describe('HTMLExprParser', () => {

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

    describe('setNodeValue method', () => {
        it('should set html content when init render', done => {
            const assists = createAssists();
            const {tree, nodesManager, scopeModel, domUpdater} = assists;

            const domNode = document.createElement('div');
            domNode.innerHTML = '${name}';
            const startNode = nodesManager.getNode(domNode.firstChild);
            const endNode = nodesManager.getNode(domNode.firstChild);
            const htmlExprParser = new HTMLExprParser({tree, startNode, endNode});

            htmlExprParser.collectExprs();
            domUpdater.start();
            scopeModel.set('name', {type: 'html', html: '<span>yibuyisheng</span>'});
            htmlExprParser.initRender(() => {
                expect(domNode.innerHTML).toBe('<span>yibuyisheng</span>');
                done();
            });

            setTimeout(() => destroyAssists(assists), 1000);
        });

        it('should set text content when init render', done => {
            const assists = createAssists();
            const {tree, nodesManager, scopeModel, domUpdater} = assists;

            const domNode = document.createElement('div');
            domNode.innerHTML = '${name}';
            const startNode = nodesManager.getNode(domNode.firstChild);
            const endNode = nodesManager.getNode(domNode.firstChild);
            const htmlExprParser = new HTMLExprParser({tree, startNode, endNode});

            htmlExprParser.collectExprs();
            domUpdater.start();
            scopeModel.set('name', 'yibuyisheng');
            htmlExprParser.initRender(() => {
                expect(domNode.innerHTML).toBe('yibuyisheng');
                done();
            });

            setTimeout(() => destroyAssists(assists), 1000);
        });

        it('should handle text content and html content in turn', done => {
            const assists = createAssists();
            const {tree, nodesManager, scopeModel, domUpdater, exprWatcher} = assists;

            const domNode = document.createElement('div');
            domNode.innerHTML = '${name}';
            const startNode = nodesManager.getNode(domNode.firstChild);
            const endNode = nodesManager.getNode(domNode.firstChild);
            const htmlExprParser = new HTMLExprParser({tree, startNode, endNode});

            htmlExprParser.collectExprs();
            domUpdater.start();
            exprWatcher.start();
            exprWatcher.on('change', (event, done) => htmlExprParser.onExpressionChange(event, done));
            scopeModel.set('name', 'yibuyisheng');
            htmlExprParser.initRender(() => {
                expect(domNode.innerHTML).toBe('yibuyisheng');

                scopeModel.set('name', {type: 'html', html: '<span>yibuyisheng</span>'}, false, () => {
                    expect(domNode.innerHTML).toBe('<span>yibuyisheng</span>');
                    done();
                });
            });

            setTimeout(() => destroyAssists(assists), 1000);
        });
    });
});
