/**
 * @file dom fragment的封装
 * @author yibuyisheng(yibuyisheng@163.com)
 */

export default class Fragment {
    constructor(manager) {
        this.$$manager = manager;

        let xmlDoc;
        if (window.DOMParser) {
            let parser = new DOMParser();
            xmlDoc = parser.parseFromString('<div></div>', 'text/xml');
        }
        // Internet Explorer
        else {
            xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
            xmlDoc.async = false;
            xmlDoc.loadXML('<div></div>');
        }
        this.$$fragment = manager.getNode(xmlDoc.childNodes[0]);
    }

    appendChild(node) {
        this.$$fragment.appendChild(node);
    }

    getChildNodes() {
        return this.$$fragment.getChildNodes();
    }

    getFirstChild() {
        return this.$$fragment.getFirstChild();
    }

    getLastChild() {
        return this.$$fragment.getLastChild();
    }

    setInnerHTML(html) {
        this.$$fragment.setInnerHTML(html);
    }

    getInnerHTML() {
        return this.$$fragment.getInnerHTML();
    }
}
