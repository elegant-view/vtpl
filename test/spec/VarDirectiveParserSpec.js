import Vtpl from 'vtpl';

describe('VarDirectiveParser', () => {
    let node;

    beforeEach(() => {
        node = document.createElement('div');
    });

    it('base function', () => {
        node.innerHTML = '<!-- var: name="yibuyisheng" -->';

        let tpl = new Vtpl({startNode: node, endNode: node});
        expect(tpl.tree.rootScope.get('name')).toBe(undefined);
        tpl.render();

        expect(tpl.tree.rootScope.get('name')).toBe('yibuyisheng');
    });
});
