/**
 * @file dom fragment的封装
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Node from './Node';

export default class Fragment {
    constructor(manager) {
        this.$$manager = manager;
        this.$$fragment = this.$$manager.createElement('div');
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
        let xmlDoc;
        if (window.DOMParser) {
            let parser = new DOMParser();
            xmlDoc = parser.parseFromString(html, 'text/xml');
        }
        // Internet Explorer
        else {
            xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
            xmlDoc.async = false;
            xmlDoc.loadXML(html);
        }

        this.$$fragment.setInnerHTML('');
        walk.call(this, xmlDoc, this.$$fragment);

        function createDOMNode(parserNode) {
            let nodeType = parserNode.nodeType;
            if (nodeType === Node.ELEMENT_NODE) {
                let node = document.createElement(parserNode.tagName);
                let attributes = parserNode.attributes;
                for (let i = 0, il = attributes.length; i < il; ++i) {
                    let attr = attributes[i];
                    node.setAttribute(attr.name, attr.value);
                }
                return this.$$manager.getNode(node);
            }

            if (nodeType === Node.TEXT_NODE) {
                let node = document.createTextNode(parserNode.nodeValue);
                return this.$$manager.getNode(node);
            }

            if (nodeType === Node.COMMENT_NODE) {
                let node = document.createComment(parserNode.nodeValue);
                return this.$$manager.getNode(node);
            }

            throw new Error(`unknown node type: ${nodeType}`);
        }

        function walk(rootParserNode, rootDOMNode) {
            let childNodes = rootParserNode.childNodes;
            for (let i = 0, il = childNodes.length; i < il; ++i) {
                let curDOMNode = createDOMNode.call(this, childNodes[i]);
                rootDOMNode.appendChild(curDOMNode);
                walk.call(this, childNodes[i], curDOMNode);
            }
        }
    }

    getInnerHTML() {
        return this.$$fragment.getInnerHTML();
    }
}
