/**
 * @file if 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var DirectiveParser = require('./DirectiveParser');
var inherit = require('./inherit');
var utils = require('./utils');
var Tree = require('./Tree');

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

    return branches;

    function setEndNode(curNode, branches, branchIndex) {
        if (branchIndex + 1 && branches[branchIndex].startNode) {
            branches[branchIndex].endNode = curNode.previousSibling;
        }
    }
};

IfDirectiveParser.prototype.setData = function (data) {
    var exprs = this.exprs;
    for (var i = 0, il = exprs.length; i < il; i++) {
        var expr = exprs[i];
        var exprValue = this.exprFns[expr](data);
        if (exprValue) {
            return i;
        }
    }

    if (this.hasElseBranch) {
        return i;
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
