/**
 * @file if 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var DirectiveParser = require('./DirectiveParser');
var utils = require('../utils');
var Tree = require('../trees/Tree');
var Node = require('../nodes/Node');

var IfDirectiveParser = DirectiveParser.extends(
    {
        initialize: function (options) {
            DirectiveParser.prototype.initialize.apply(this, arguments);

            this.startNode = options.startNode;
            this.endNode = options.endNode;

            this.exprs = [];
            this.exprFns = {};
            this.$branchTrees = [];

            var domUpdater = this.tree.getTreeVar('domUpdater');
            this.handleBranchesTaskId = domUpdater.generateTaskId();
        },

        collectExprs: function () {
            var branchNodeStack = [];
            var me = this;
            var config = this.tree.getTreeVar('config');
            Node.iterate(this.startNode, this.endNode, function (node) {
                var ifNodeType = getIfNodeType(node, me.tree.getTreeVar('config'));
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
                    var expr = node.getNodeValue().replace(config.getAllIfRegExp(), '');
                    me.exprs.push(expr);

                    if (!me.exprFns[expr]) {
                        me.exprFns[expr] = utils.createExprFn(
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

            for (var i = 0, il = branchNodeStack.length - 1; i < il; ++i) {
                var curNode = branchNodeStack[i];
                var nextNode = branchNodeStack[i + 1];

                var curNodeNextSibling = curNode.node.getNextSibling();
                // curNode 和 nextNode 之间没有节点
                if (curNodeNextSibling.equal(nextNode.node)) {
                    this.$branchTrees.push(null);
                }
                else {
                    var tree = this.createTree(
                        this.tree,
                        curNodeNextSibling,
                        nextNode.node.getPreviousSibling()
                    );
                    this.$branchTrees.push(tree);
                    tree.traverse();
                }
            }
        },

        linkScope: function () {
            DirectiveParser.prototype.linkScope.apply(this, arguments);
            this.onChange();
        },

        onChange: function () {
            var domUpdater = this.tree.getTreeVar('domUpdater');
            var exprs = this.exprs;
            var showIndex;
            for (var i = 0, il = exprs.length; i < il; i++) {
                var expr = exprs[i];
                var exprValue = this.exprFns[expr](this.tree.rootScope);
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
                utils.bind(handleBranches, null, this.$branchTrees, showIndex)
            );
        },

        destroy: function () {
            for (var i = 0, il = this.$branchTrees.length; i < il; ++i) {
                var branchTree = this.$branchTrees[i];
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
    },
    {
        isProperNode: function (node, config) {
            return getIfNodeType(node, config) === IfDirectiveParser.IF_START;
        },

        isEndNode: function (node, config) {
            return getIfNodeType(node, config) === IfDirectiveParser.IF_END;
        },

        findEndNode: function () {
            return this.walkToEnd.apply(this, arguments);
        },

        getNoEndNodeError: function () {
            return new Error('the if directive is not properly ended!');
        },

        $name: 'IfDirectiveParser',

        IF_START: 1,
        ELIF: 2,
        ELSE: 3,
        IF_END: 4
    }
);

module.exports = IfDirectiveParser;
Tree.registeParser(module.exports);

function handleBranches(branches, showIndex) {
    utils.each(branches, function (branchTree, j) {
        if (!branchTree) {
            return;
        }

        var fn = j === showIndex ? 'restoreFromDark' : 'goDark';
        branchTree[fn]();
    });
}

function getIfNodeType(node, config) {
    var nodeType = node.getNodeType();
    if (nodeType !== Node.COMMENT_NODE) {
        return;
    }

    var nodeValue = node.getNodeValue();
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
