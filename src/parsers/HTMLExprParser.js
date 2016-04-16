/**
 * @file 对设置html的情况支持一下
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import ExprParser from './ExprParser';
import {isPureObject} from '../utils';

export default class HTMLExprParser extends ExprParser {

    /**
     * 设置文本节点的“nodeValue”，此处对html的情况也做了支持
     *
     * @private
     * @param {*} value 要设置的值
     */
    setNodeValue(value) {
        if (isPureObject(value) && value.type === 'html') {
            let nodesManager = this.tree.getTreeVar('nodesManager');
            let fragment = nodesManager.createDocumentFragment();
            fragment.setInnerHTML(value.html);
            let childNodes = fragment.getChildNodes();

            let baseNode;
            if (this.startNode && this.endNode) {
                baseNode = this.startNode;
            }
            else {
                baseNode = this.startNode;
            }

            for (let childNode of childNodes) {
                baseNode.getParentNode().insertBefore(childNode, baseNode);
            }

            this.startNode.setNodeValue('');
            this.removeFromDOM(this.startNode, this.endNode);

            this.startNode = childNodes[0];
            this.endNode = childNodes[childNodes.length - 1];
        }
        else {
            if (this.startNode !== this.endNode) {
                this.removeFromDOM(this.startNode, this.endNode);
                this.startNode = this.endNode = null;
            }

            this.startNode.setNodeValue(value);
        }
    }
}
