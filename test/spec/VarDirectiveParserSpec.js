import VarDirectiveParser from 'vtpl/src/parsers/VarDirectiveParser';
import NodesManager from 'vtpl/src/nodes/NodesManager';
import Tree from 'vtpl/src/trees/Tree';
import Config from 'vtpl/src/Config';
import ExprCalculater from 'vtpl/src/ExprCalculater';
import DomUpdater from 'vtpl/src/DomUpdater';

export default function () {
    describe('VarDirectiveParser', () => {
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

        it('base function', () => {
            node.setInnerHTML('<!-- var: name="yibuyisheng" -->');
            let tree = new Tree({startNode: node, endNode: node});
            setTreeVar(tree);
            tree.compile();
            expect(tree.rootScope.get('name')).toBe(undefined);
            tree.link();
            tree.initRender();
            expect(tree.rootScope.get('name')).toBe('yibuyisheng');
        });

        function setTreeVar(tree) {
            tree.setTreeVar('nodesManager', nodesManager);
            tree.setTreeVar('config', config);
            tree.setTreeVar('exprCalculater', exprCalculater);
            tree.setTreeVar('domUpdater', domUpdater);
        }
    });
}
