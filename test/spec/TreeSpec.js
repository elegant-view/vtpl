import Tree from 'vtpl/src/trees/Tree';
import NodesManager from 'vtpl/src/nodes/NodesManager';
import Config from 'vtpl/src/Config';

export default function () {
    describe('Tree', () => {
        it('#compile()', () => {
            let div = document.createElement('div');
            div.setAttribute('id', 'root');
            div.innerHTML = `<div id="1">2-1<div id="2-2">3-1</div><div id="2-3"></div></div>`;
            let nodesManager = new NodesManager();
            let tree = new Tree({
                startNode: nodesManager.getNode(div),
                endNode: nodesManager.getNode(div)
            });
            tree.setTreeVar('nodesManager', nodesManager);
            tree.setTreeVar('config', new Config());
            tree.compile();
            expect(tree.$parsers.length).toBe(6);
        });
    });
}
