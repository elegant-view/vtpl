/**
 * @file dom fragment的封装
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Node from './Node';
import log from '../log';

const MANAGER = Symbol('manager');
const FRAGMENT = Symbol('fragment');

/**
 * Fragment
 *
 * @class
 */
export default class Fragment {

    /**
     * constructor
     *
     * @public
     * @param  {NodesManager} manager manager
     */
    constructor(manager) {
        this[MANAGER] = manager;
        this[FRAGMENT] = this[MANAGER].createElement('div');
    }

    /**
     * 追加子节点
     *
     * @public
     * @param  {WrapNode} node 要追加的节点
     */
    appendChild(node) {
        this[FRAGMENT].appendChild(node);
    }

    /**
     * 获取所有子节点
     *
     * @public
     * @return {Array.<WrapNode>}
     */
    getChildNodes() {
        return this[FRAGMENT].getChildNodes();
    }

    /**
     * 获取第一个子节点
     *
     * @public
     * @return {WrapNode}
     */
    getFirstChild() {
        return this[FRAGMENT].getFirstChild();
    }

    /**
     * 获取最后一个子节点
     *
     * @public
     * @return {WrapNode}
     */
    getLastChild() {
        return this[FRAGMENT].getLastChild();
    }

    /**
     * 设置内部html。此处会使用浏览器自带的xml解析器去解析html字符串，所以传入的html字符串必须要符合xml语法。
     *
     * @public
     * @param {string} html html字符串
     */
    setInnerHTML(html) {
        let xmlDoc;
        if (window.DOMParser) {
            let parser = new DOMParser();
            try {
                xmlDoc = parser.parseFromString(`<div>${html}</div>`, 'text/xml');
            }
            catch (error) {
                log.error(error, `\n${html}`);
                throw error;
            }
        }
        // Internet Explorer
        else {
            xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
            xmlDoc.async = false;
            try {
                xmlDoc.loadXML(`<div>${html}</div>`);
            }
            catch (error) {
                log.error(error, `\n${html}`);
                throw error;
            }
        }

        this[FRAGMENT].setInnerHTML('');
        walk.call(this, xmlDoc.childNodes[0], this[FRAGMENT]);

        function createDOMNode(parserNode) {
            let nodeType = parserNode.nodeType;
            if (nodeType === Node.ELEMENT_NODE) {
                let node = document.createElement(parserNode.tagName);
                let attributes = parserNode.attributes;
                for (let i = 0, il = attributes.length; i < il; ++i) {
                    let attr = attributes[i];
                    node.setAttribute(attr.name, attr.value);
                }
                return this[MANAGER].getNode(node);
            }

            if (nodeType === Node.TEXT_NODE) {
                let node = document.createTextNode(parserNode.nodeValue);
                return this[MANAGER].getNode(node);
            }

            if (nodeType === Node.COMMENT_NODE) {
                let node = document.createComment(parserNode.nodeValue);
                return this[MANAGER].getNode(node);
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

    /**
     * 获取innerHTML
     *
     * @public
     * @return {string}
     */
    getInnerHTML() {
        return this[FRAGMENT].getInnerHTML();
    }
}
