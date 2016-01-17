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
        let me = this;
        let config = this.tree.getTreeVar('config');
        Node.iterate(this.startNode, this.endNode, function (node) {
            let ifNodeType = getIfNodeType(node, me.tree.getTreeVar('config'));
            // if
            if (ifNodeType === IfDirectiveParser.IF_START) {
                if (branchNodeStack.length) {
                    throw new Error('wrong `if` directive syntax');
                }
                branchNodeStack.push({node: node, type: ifNodeType});
            }
            // elif
            else if (ifNodeType === IfDirectiveParser.ELIF
                || ifNodeType === IfDirectiveParser.ELSE
            ) {
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
                let tree = this.createTree(
                    this.tree,
                    curNodeNextSibling,
                    nextNode.node.getPreviousSibling()
                );
                this.$branchTrees.push(tree);
                tree.traverse();
            }
        }
    }

    linkScope() {
        DirectiveParser.prototype.linkScope.apply(this, arguments);
        this.onChange();
    }

    onChange() {
        let domUpdater = this.tree.getTreeVar('domUpdater');
        let exprs = this.exprs;
        let showIndex;
        let i = 0;
        for (let il = exprs.length; i < il; ++i) {
            let expr = exprs[i];
            let exprValue = this.exprFns[expr](this.tree.rootScope);
            if (exprValue) {
                showIndex = i;
                break;
            }
        }

        if (this.$$hasElseBranch) {
            showIndex = i;
        }

        domUpdater.addTaskFn(
            this.handleBranchesTaskId,
            bind(handleBranches, null, this.$branchTrees, showIndex)
        );
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
