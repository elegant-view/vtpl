import NodesManager from 'vtpl/src/nodes/NodesManager';
import Node from 'vtpl/src/nodes/Node';

export default function () {
    describe('NodesManager 测试', () => {
        let manager;
        beforeEach(() => manager = new NodesManager());
        afterEach(() => manager.destroy());

        it('#getNode()', () => {
            let domNode;
            let node = manager.getNode(domNode);
            expect(node).toBeNull();

            domNode = document.createElement('i');
            node = manager.getNode(domNode);
            expect(node).toEqual(manager.getNode(domNode));

            let anotherNode = manager.getNode(document.createElement('i'));
            expect(node).not.toBe(anotherNode);
        });

        it('#createElement()', () => {
            let node = manager.createElement('div');
            expect(node.getDOMNode().tagName.toLowerCase()).toBe('div');
        });

        it('#createCommnet()', () => {
            let node = manager.createComment('---');
            expect(node.getNodeType()).toBe(Node.COMMENT_NODE);
            expect(node.getNodeValue()).toBe('---');
        });
    });
}
