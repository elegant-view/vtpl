import Fragment from 'vtpl/src/nodes/Fragment';
import NodesManager from 'vtpl/src/nodes/NodesManager';

export default function () {
    let nodesManager;
    beforeEach(() => {
        nodesManager = new NodesManager();
    });
    describe('Fragment', () => {
        it('table', () => {
            let fragment = nodesManager.createDocumentFragment();
            fragment.setInnerHTML('<table></table>');
            expect(fragment.getInnerHTML()).toBe('<table></table>');
        });

        it('thead', () => {
            let fragment = nodesManager.createDocumentFragment();
            fragment.setInnerHTML('<thead><tr><td></td></tr></thead>');
            expect(fragment.getInnerHTML()).toBe('<thead><tr><td></td></tr></thead>');
        });

        it('tbody', () => {
            let fragment = nodesManager.createDocumentFragment();
            fragment.setInnerHTML('<tbody><tr><td></td></tr></tbody>');
            expect(fragment.getInnerHTML()).toBe('<tbody><tr><td></td></tr></tbody>');
        });

        it('tfoot', () => {
            let fragment = nodesManager.createDocumentFragment();
            fragment.setInnerHTML('<tfoot><tr><td></td></tr></tfoot>');
            expect(fragment.getInnerHTML()).toBe('<tfoot><tr><td></td></tr></tfoot>');
        });

        it('tr', () => {
            let fragment = nodesManager.createDocumentFragment();
            fragment.setInnerHTML('<tr><td></td></tr>');
            expect(fragment.getInnerHTML()).toBe('<tr><td></td></tr>');
        });

        it('td', () => {
            let fragment = nodesManager.createDocumentFragment();
            fragment.setInnerHTML('<td></td>');
            expect(fragment.getInnerHTML()).toBe('<td></td>');
        });

        it('appendChild()', () => {
            let fragment = nodesManager.createDocumentFragment();
            let node = nodesManager.createElement('div');
            fragment.appendChild(node);
            expect(fragment.getChildNodes()[0]).toBe(node);
        });
    });
}
