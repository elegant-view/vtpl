/**
 * @file dom fragment的封装
 * @author yibuyisheng(yibuyisheng@163.com)
 */

export default class Fragment {
    constructor() {
        this.$$fragment = document.createElement('div');
    }

    appendChild(node) {
        this.$$fragment.appendChild(node.$node);
    }

    setInnerHTML(html) {
        let container;
        let realContainer;
        if (/^\s*<(thead|tbody|tbody)\s*>/i.test(html)) {
            container = document.createElement('table');
            container.innerHTML = `<table>${html}</table>`;
            realContainer = container.firstChild;
        }
        else if (/^\s*<tr\s*>/i.test(html)) {
            container = document.createElement('table');
            container.innerHTML = `<table><tbody>${html}</tbody></table>`;
            realContainer = container.firstChild.firstChild;
        }
        else if (/^\s*<td\s*>/i.test(html)) {
            container = document.createElement('table');
            container.innerHTML = `<table><tbody><tr>${html}</tr></tbody></table>`;
            realContainer = container.firstChild.firstChild.firstChild;
        }
        else {
            container = document.createElement('div');
            container.innerHTML = html;
            realContainer = container;
        }

        while (realContainer.childNodes[0]) {
            this.$$fragment.appendChild(realContainer.childNodes[0]);
        }
    }

    getInnerHTML() {
        return this.$$fragment.innerHTML;
    }
}
