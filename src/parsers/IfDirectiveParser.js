/**
 * @file if 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var DirectiveParser = require('./DirectiveParser');
var inherit = require('../inherit');
var utils = require('../utils');
var Tree = require('../trees/Tree');

function IfDirectiveParser(options) {
    DirectiveParser.call(this, options);
}

IfDirectiveParser.prototype.initialize = function (options) {
    DirectiveParser.prototype.initialize.apply(this, arguments);

    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;

    this.exprs = [];
    this.exprFns = {};

    this.handleBranchesTaskId = this.domUpdater.generateTaskId();
};

IfDirectiveParser.prototype.collectExprs = function () {
    var branches = [];
    var branchIndex = -1;

    utils.traverseNodes(this.startNode, this.endNode, function (curNode) {
        var nodeType = getIfNodeType(curNode, this.config);

        if (nodeType) {
            setEndNode(curNode, branches, branchIndex);

            branchIndex++;
            branches[branchIndex] = branches[branchIndex] || {};

            // 是 if 节点或者 elif 节点，搜集表达式
            if (nodeType < 3) {
                var expr = curNode.nodeValue.replace(this.config.getAllIfRegExp(), '');
                this.exprs.push(expr);

                if (!this.exprFns[expr]) {
                    this.exprFns[expr] = utils.createExprFn(this.config.getExprRegExp(), expr, this.exprCalculater);
                }
            }
            else if (nodeType === 3) {
                this.hasElseBranch = true;
            }
        }
        else {
            if (!branches[branchIndex].startNode) {
                branches[branchIndex].startNode = curNode;
            }
        }

        curNode = curNode.nextSibling;
        if (!curNode || curNode === this.endNode) {
            setEndNode(curNode, branches, branchIndex);
            return true;
        }
    }, this);

    this.branches = branches;
    return branches;

    function setEndNode(curNode, branches, branchIndex) {
        if (branchIndex + 1 && branches[branchIndex].startNode) {
            branches[branchIndex].endNode = curNode.previousSibling;
        }
    }
};

IfDirectiveParser.prototype.onChange = function () {
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
};

IfDirectiveParser.prototype.destroy = function () {
    this.startNode = null;
    this.endNode = null;
    this.config = null;
    this.exprs = null;
    this.exprFns = null;

    DirectiveParser.prototype.destroy.call(this);
};

IfDirectiveParser.isProperNode = function (node, config) {
    return getIfNodeType(node, config) === 1;
};

IfDirectiveParser.findEndNode = function (ifStartNode, config) {
    var curNode = ifStartNode;
    while ((curNode = curNode.nextSibling)) {
        if (isIfEndNode(curNode, config)) {
            return curNode;
        }
    }
};

IfDirectiveParser.getNoEndNodeError = function () {
    return new Error('the if directive is not properly ended!');
};

module.exports = inherit(IfDirectiveParser, DirectiveParser);
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
