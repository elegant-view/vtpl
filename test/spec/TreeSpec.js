import Vtpl from 'vtpl';

describe('Tree', () => {
    it('#compile()', () => {
        let div = document.createElement('div');
        div.setAttribute('id', 'root');
        div.innerHTML = `<div id="1">2-1<div id="2-2">3-1</div><div id="2-3"></div></div>`;

        let tpl = new Vtpl({startNode: div, endNode: div});
        tpl.render();

        expect(tpl.$tree.getParsersLength()).toBe(6);
    });
});
