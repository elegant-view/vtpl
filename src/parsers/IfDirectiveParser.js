/**
 * @file if 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';
import {createExprFn, each, bind, extend} from '../utils';
import Tree from '../trees/Tree';
import Node from '../nodes/Node';

class IfDirectiveParser extends DirectiveParser {
    constructor(options) {
        super(options);

        this.startNode = options.startNode;
        this.endNode = options.endNode;

        this.exprs = [];
        this.exprFns = {};
        this.$branchTrees = [];

        let domUpdater = this.tree.getTreeVar('domUpdater');
        this.handleBranchesTaskId = domUpdater.generateTaskId();
    }

    collectExprs() {
        let branchNodeStack = [];
        // 这个计数器是用来处理if指令嵌套问题的。
        // 当nestCounter为0的时候，遇到的各种if相关指令才属于当前parser的，
        // 否则是嵌套的if指令
        let nestCounter = 0;
        let me = this;
        let config = this.tree.getTreeVar('config');
        // console.log(this.startNode.$node.nodeValue);
        // if (this.startNode.$node.nodeValue === ' if: ${day.isEnable} ') {
        //     debugger
        // }
        Node.iterate(this.startNode, this.endNode, function (node) {
            let ifNodeType = getIfNodeType(node, me.tree.getTreeVar('config'));
            // if
            if (ifNodeType === IfDirectiveParser.IF_START) {
                // 已经有了一个if分支，再来一个if分支，说明很可能是if嵌套
                if (branchNodeStack.length) {
                    ++nestCounter;
                    return;
                }

                branchNodeStack.push({node: node, type: ifNodeType});
            }
            // elif
            else if (ifNodeType === IfDirectiveParser.ELIF
                || ifNodeType === IfDirectiveParser.ELSE
            ) {
                // 有嵌套，就不管这个分支了
                if (nestCounter) {
                    return;
                }

                if (!branchNodeStack.length
                    || (
                        // 前面一个分支既不是`if`，也不是`elif`
                        branchNodeStack[branchNodeStack.length - 1].type !== IfDirectiveParser.IF_START
                        && branchNodeStack[branchNodeStack.length - 1].type !== IfDirectiveParser.ELIF
                    )
                ) {
                    throw new Error('wrong `if` directive syntax');
                }
                branchNodeStack.push({node: node, type: ifNodeType});
            }
            // /if
            else if (ifNodeType === IfDirectiveParser.IF_END) {
                // 有嵌套，此时要退出一层嵌套
                if (nestCounter) {
                    --nestCounter;
                    return;
                }

                branchNodeStack.push({node: node, type: ifNodeType});
            }

            // 是 if 节点或者 elif 节点，搜集表达式
            if (ifNodeType === IfDirectiveParser.IF_START
                || ifNodeType === IfDirectiveParser.ELIF
            ) {
                let expr = node.getNodeValue().replace(config.getAllIfRegExp(), '');
                me.exprs.push(expr);

                if (!me.exprFns[expr]) {
                    me.exprFns[expr] = createExprFn(
                        config.getExprRegExp(),
                        expr,
                        me.tree.getTreeVar('exprCalculater')
                    );
                }
            }

            if (ifNodeType === IfDirectiveParser.ELSE) {
                me.$$hasElseBranch = true;
            }
        });

        for (let i = 0, il = branchNodeStack.length - 1; i < il; ++i) {
            let curNode = branchNodeStack[i];
            let nextNode = branchNodeStack[i + 1];

            let curNodeNextSibling = curNode.node.getNextSibling();
            // curNode 和 nextNode 之间没有节点
            if (curNodeNextSibling.equal(nextNode.node)) {
                this.$branchTrees.push(null);
            }
            else {
                let tree = new Tree({
                    startNode: curNodeNextSibling,
                    endNode: nextNode.node.getPreviousSibling()
                });
                tree.setParent(this.tree);

                this.$branchTrees.push(tree);
                tree.collectExprs();
            }
        }
    }

    linkToParentScope(branchTree) {
        this.tree.rootScope.addChild(branchTree.rootScope);
        branchTree.rootScope.setParent(this.tree.rootScope);
    }

    unlinkFromParentScope(branchTree) {
        this.tree.rootScope.removeChild(branchTree.rootScope);
        branchTree.rootScope.setParent(null);
    }

    linkScope() {
        DirectiveParser.prototype.linkScope.apply(this, arguments);
        for (let i = 0, il = this.$branchTrees.length; i < il; ++i) {
            this.$branchTrees[i].linkScope();
        }
    }

    onChange(model, changes) {
        let domUpdater = this.tree.getTreeVar('domUpdater');
        let exprs = this.exprs;
        let showIndex;
        let i = 0;
        for (let il = exprs.length; i < il; ++i) {
            let expr = exprs[i];
            let exprValue = this.exprFns[expr](this.tree.rootScope);
            if (exprValue) {
                showIndex = i;
                this.linkToParentScope(this.$branchTrees[i]);
            }
            else {
                this.unlinkFromParentScope(this.$branchTrees[i]);
            }
        }

        if (showIndex === undefined && this.$$hasElseBranch) {
            showIndex = i;
            this.linkToParentScope(this.$branchTrees[i]);
        }

        domUpdater.addTaskFn(
            this.handleBranchesTaskId,
            bind(handleBranches, null, this.$branchTrees, showIndex)
        );
    }

    getChildNodes() {
        return [];
    }

    destroy() {
        for (let i = 0, il = this.$branchTrees.length; i < il; ++i) {
            let branchTree = this.$branchTrees[i];
            branchTree.destroy();
        }

        this.startNode = null;
        this.endNode = null;
        this.exprs = null;
        this.exprFns = null;
        this.handleBranchesTaskId = null;
        this.branchTrees = null;

        DirectiveParser.prototype.destroy.call(this);
    }

    getStartNode() {
        return this.startNode;
    }

    getEndNode() {
        return this.endNode;
    }


    static isProperNode(node, config) {
        return getIfNodeType(node, config) === IfDirectiveParser.IF_START;
    }

    static isEndNode(node, config) {
        return getIfNodeType(node, config) === IfDirectiveParser.IF_END;
    }

    static findEndNode() {
        return this.walkToEnd.apply(this, arguments);
    }

    static getNoEndNodeError() {
        return new Error('the if directive is not properly ended!');
    }
}

extend(IfDirectiveParser, {
    IF_START: 1,
    ELIF: 2,
    ELSE: 3,
    IF_END: 4
});

function handleBranches(branches, showIndex) {
    each(branches, function (branchTree, j) {
        if (!branchTree) {
            return;
        }

        let fn = j === showIndex ? 'restoreFromDark' : 'goDark';
        branchTree[fn]();
    });
}

function getIfNodeType(node, config) {
    let nodeType = node.getNodeType();
    if (nodeType !== Node.COMMENT_NODE) {
        return;
    }

    let nodeValue = node.getNodeValue();
    if (config.ifPrefixRegExp.test(nodeValue)) {
        return IfDirectiveParser.IF_START;
    }

    if (config.elifPrefixRegExp.test(nodeValue)) {
        return IfDirectiveParser.ELIF;
    }

    if (config.elsePrefixRegExp.test(nodeValue)) {
        return IfDirectiveParser.ELSE;
    }

    if (config.ifEndPrefixRegExp.test(nodeValue)) {
        return IfDirectiveParser.IF_END;
    }
}

Tree.registeParser(IfDirectiveParser);
export default IfDirectiveParser;
