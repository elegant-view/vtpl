/**
 * @file dom fragment的封装
 * @author yibuyisheng(yibuyisheng@163.com)
 */

export default class Fragment {
    constructor(manager) {
        this.$$manager = manager;
        this.$$fragment = manager.createElement('div');
    }

    appendChild(node) {
        this.$$fragment.appendChild(node);
    }

    getChildNodes() {
        return this.$$fragment.getChildNodes();
    }

    setInnerHTML(html) {
        let container;
        let realContainer;
        if (/^\s*<(thead|tbody|tfoot)\s*>/i.test(html)) {
            container = document.createElement('table');
            container.innerHTML = html;
            realContainer = container;
        }
        else if (/^\s*<tr\s*>/i.test(html)) {
            container = document.createElement('table');
            container.innerHTML = `<tbody>${html}</tbody>`;
            realContainer = container.firstChild;
        }
        else if (/^\s*<td\s*>/i.test(html)) {
            container = document.createElement('table');
            container.innerHTML = `<tbody><tr>${html}</tr></tbody>`;
            realContainer = container.firstChild.firstChild;
        }
        else {
            container = document.createElement('div');
            container.innerHTML = html;
            realContainer = container;
        }

        while (realContainer.childNodes[0]) {
            this.$$fragment.appendChild(this.$$manager.getNode(realContainer.childNodes[0]));
        }
    }

    getInnerHTML() {
        return this.$$fragment.getInnerHTML();
    }
}
