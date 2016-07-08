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
