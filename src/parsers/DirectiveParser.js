/**
 * @file 指令解析器抽象类。指令节点一定是注释节点
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Parser from './Parser';
import Node from '../nodes/Node';
import {nextTick} from '../utils';

export default class DirectiveParser extends Parser {

    static priority = 1;

    initRender(done) {
        nextTick(done);
    }

    static isProperNode(node) {
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
     * @return {nodes/Node}
     */
    static walkToEnd(startNode) {
        let curNode = startNode;
        // 为了应对指令嵌套
        let stackCounter = 0;
        while ((curNode = curNode.getNextSibling())) {
            if (this.isProperNode(curNode)) {
                ++stackCounter;
            }

            if (this.isEndNode(curNode)) {
                if (stackCounter === 0) {
                    return curNode;
                }
                --stackCounter;
            }
        }
    }
}
