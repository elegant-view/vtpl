/**
 * @file 指令解析器抽象类。指令节点一定是注释节点
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Parser from './Parser';
import Node from '../nodes/Node';

export default class DirectiveParser extends Parser {
    constructor(options) {
        super(options);

        this.node = options.node;
    }

    /**
     * 根据父级数创建子树。
     *
     * @protected
     * @param  {Tree} parentTree 父级树
     * @param {nodes/Node} startNode 开始节点
     * @param {nodes/Node} endNode 结束节点
     * @return {Tree}  创建好的子树
     */
    createTree(parentTree, startNode, endNode) {
        let tree = this.tree.createTree({startNode, endNode});
        tree.setParent(parentTree);
        tree.rootScope.setParent(parentTree.rootScope);
        parentTree.rootScope.addChild(tree.rootScope);
        return tree;
    }

    /**
     * 移除使用 createTree 创建好的树
     *
     * @protected
     * @param {Tree} tree 要移除的树
     */
    removeTree(tree) {
        tree.rootScope.setParent(null);
        this.tree.rootScope.removeChild(tree.rootScope);

        tree.setParent(null);
        tree.destroy();
    }

    getStartNode() {
        return this.node;
    }

    getEndNode() {
        return this.node;
    }

    destroy() {
        this.node = null;

        super.destroy();
    }

    static isProperNode(node, config) {
        return node.getNodeType() === Node.COMMENT_NODE;
    }

    static isEndNode() {
        return true;
    }

    /**
     * 对于分起始部分和结束部分的指令，找到结束部分指令对应的节点。
     * 仅供内部使用。
     *
     * @param {nodes/Node} startNode 开始寻找的节点
     * @param {Config} config 配置
     * @return {nodes/Node}
     */
    static walkToEnd(startNode, config) {
        let curNode = startNode;
        // 为了应对指令嵌套
        let stackCounter = 0;
        while ((curNode = curNode.getNextSibling())) {
            if (this.isProperNode(curNode, config)) {
                ++stackCounter;
            }

            if (this.isEndNode(curNode, config)) {
                if (stackCounter === 0) {
                    return curNode;
                }
                --stackCounter;
            }
        }
    }
}
