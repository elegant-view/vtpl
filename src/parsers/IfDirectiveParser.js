/**
 * @file if 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var DirectiveParser = require('./DirectiveParser');
var utils = require('../utils');
var Tree = require('../trees/Tree');
var Node = require('../nodes/Node');

module.exports = DirectiveParser.extends(
    {
        initialize: function (options) {
            DirectiveParser.prototype.initialize.apply(this, arguments);

            this.startNode = options.startNode;
            this.endNode = options.endNode;
            this.config = options.config;

            this.exprs = [];
            this.exprFns = {};

            this.handleBranchesTaskId = this.domUpdater.generateTaskId();
        },

        collectExprs: function () {
            var branchNodeStack = [];
            Node.iterate(this.startNode, this.endNode, function (node) {
                var ifNodeType = getIfNodeType(node);
                // if
                if (ifNodeType === 1) {
                    if (branchNodeStack.length) {
                        throw new Error('wrong `if` directive syntax');
                    }
                    branchNodeStack.push({node: node, type: ifNodeType});
                }
                // elif
                else if (ifNodeType === 2 || ifNodeType === 3) {
                    if (!branchNodeStack.length
                        || (
                            // 前面一个分支既不是`if`，也不是`elif`
                            branchNodeStack[branchNodeStack.length - 1].type !== 1
                            && branchNodeStack[branchNodeStack.length - 1].type !== 2
                        )
                    ) {
                        throw new Error('wrong `if` directive syntax');
                    }
                    branchNodeStack.push({node: node, type: ifNodeType});
                }
                // /if
                else if (ifNodeType === 4) {
                    branchNodeStack.push({node: node, type: ifNodeType});
                }

                // 是 if 节点或者 elif 节点，搜集表达式
                if (ifNodeType < 3) {
                    var expr = curNode.nodeValue.replace(this.config.getAllIfRegExp(), '');
                    this.exprs.push(expr);

                    if (!this.exprFns[expr]) {
                        this.exprFns[expr] = utils.createExprFn(
                            this.config.getExprRegExp(),
                            expr,
                            this.exprCalculater
                        );
                    }
                }
            });
            this.branchNodeStack = branchNodeStack;

            var branchTrees = [];
            for (var i = 0, il = branchNodeStack.length - 1; i < il; ++i) {
                var curNode = branchNodeStack[i];
                var nextNode = branchNodeStack[i + 1];

                var curNodeNextSibling = curNode.getNextSibling();
                // curNode 和 nextNode 之间没有节点
                if (curNodeNextSibling.equal(nextNode)) {
                    branchTrees.push(new Tree({}));
                }
                else {
                    branchTrees.push(new Tree({
                        startNode: curNodeNextSibling,
                        endNode: nextNode.getPreviousSibling()
                    }));
                }
            }
        },

        onChange: function () {
            var exprs = this.exprs;
            for (var i = 0, il = exprs.length; i < il; i++) {
                var expr = exprs[i];
                var exprValue = this.exprFns[expr](this.scopeModel);
                if (exprValue) {
                    this.domUpdater.addTaskFn(
                        this.handleBranchesTaskId,
                        utils.bind(handleBranches, null, this.branches, i)
                    );
                    return;
                }
            }

            if (this.hasElseBranch) {
                this.domUpdater.addTaskFn(
                    this.handleBranchesTaskId,
                    utils.bind(handleBranches, null, this.branches, i)
                );
                return;
            }
        },

        destroy: function () {
            this.startNode = null;
            this.endNode = null;
            this.config = null;
            this.exprs = null;
            this.exprFns = null;

            DirectiveParser.prototype.destroy.call(this);
        }
    },
    {
        isProperNode: function (node, config) {
            return getIfNodeType(node, config) === 1;
        },

        findEndNode: function (ifStartNode, config) {
            var curNode = ifStartNode;
            while ((curNode = curNode.nextSibling)) {
                if (isIfEndNode(curNode, config)) {
                    return curNode;
                }
            }
        },

        getNoEndNodeError: function () {
            return new Error('the if directive is not properly ended!');
        },

        $name: 'IfDirectiveParser'
    }
);

Tree.registeParser(module.exports);

function handleBranches(branches, showIndex) {
    utils.each(branches, function (branch, j) {
        var fn = j === showIndex ? 'restoreFromDark' : 'goDark';
        utils.each(branch, function (parserObj) {
            parserObj.parser[fn]();
        });
    });
}

function isIfEndNode(node, config) {
    return getIfNodeType(node, config) === 4;
}

function getIfNodeType(node, config) {
    if (node.nodeType !== 8) {
        return;
    }

    if (config.ifPrefixRegExp.test(node.nodeValue)) {
        return 1;
    }

    if (config.elifPrefixRegExp.test(node.nodeValue)) {
        return 2;
    }

    if (config.elsePrefixRegExp.test(node.nodeValue)) {
        return 3;
    }

    if (config.ifEndPrefixRegExp.test(node.nodeValue)) {
        return 4;
    }
}
