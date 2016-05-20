/**
 * @file 管理节点的工具
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Base from '../Base';
import Node from './Node';
import Fragment from './Fragment';

const ID_COUNTER = Symbol('idCounter');
const NODES_MAP = Symbol('nodesMap');
const DOM_NODE_ID_KEY = Symbol('domNodeIdKey');

let managerIdCounter = 0;

export default class NodesManager extends Base {

    constructor() {
        super();

        this[ID_COUNTER] = 0;
        this[NODES_MAP] = {};
        this[DOM_NODE_ID_KEY] = 'nodeId-' + ++managerIdCounter;
    }

    /**
     * 获取domNodeIdKey
     *
     * @public
     * @return {string}
     */
    get domNodeIdKey() {
        return this[DOM_NODE_ID_KEY];
    }

    /**
     * 根据 domNode 拿到对应的经过包装的 nodes/Node 实例
     *
     * @public
     * @param  {Node|Undefined}  domNode dom节点
     * @return {nodes/Node}      nodes/Node 实例
     */
    getNode(domNode) {
        if (!domNode) {
            return null;
        }

        let nodeId = domNode[this[DOM_NODE_ID_KEY]];

        if (!nodeId) {
            nodeId = domNode[this[DOM_NODE_ID_KEY]] = ++this[ID_COUNTER];
        }

        if (!this[NODES_MAP][nodeId]) {
            this[NODES_MAP][nodeId] = new Node(domNode, this);
        }

        return this[NODES_MAP][nodeId];
    }

    /**
     * 销毁所有的节点
     *
     * @public
     */
    destroy() {
        /* eslint-disable guard-for-in */
        for (let id in this[NODES_MAP]) {
            this[NODES_MAP][id].destroy();
        }
        /* eslint-enable guard-for-in */
    }

    /**
     * 创建元素，参数同document.createElement
     *
     * @public
     * @param  {string} tagName 标签名字
     * @return {WrapNode}
     */
    createElement(tagName) {
        return this.getNode(document.createElement(tagName));
    }

    /**
     * 创建注释节点
     *
     * @public
     * @param  {string} data 要添加到注释界面里面去的字符串
     * @return {WrapNode}
     */
    createComment(data) {
        return this.getNode(document.createComment(data));
    }

    /**
     * 创建fragment
     *
     * @public
     * @return {Fragment}
     */
    createDocumentFragment() {
        return new Fragment(this);
    }
}
