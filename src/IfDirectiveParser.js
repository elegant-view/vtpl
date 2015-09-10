/**
 * @file if 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');
var inherit = require('./inherit');
var utils = require('./utils');

function IfDirectiveParser(options) {
    Parser.call(this, options);
}

IfDirectiveParser.prototype.initialize = function (options) {
    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;

    this.exprs = [];
    this.exprFns = {};
};

IfDirectiveParser.prototype.collectExprs = function () {
    var curNode = this.startNode;
    var branches = [];
    var branchIndex = -1;
    do {
        var nodeType = getIfNodeType(curNode);

        if (nodeType) {
            setEndNode(curNode, branches, branchIndex);

            branchIndex++;
            branches[branchIndex] = branches[branchIndex] || {};

            // 是 if 节点或者 elif 节点，搜集表达式
            if (nodeType < 3) {
                var expr = curNode.nodeValue.replace(/\s*(if|elif|else|\/if):\s*/g, '');
                this.exprs.push(expr);

                if (!this.exprFns[expr]) {
                    this.exprFns[expr] = utils.createExprFn(this.config.exprRegExp, expr);
                }
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
            break;
        }
    } while (true);

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
};

IfDirectiveParser.isIfNode = function (node) {
    return getIfNodeType(node) === 1;
};

IfDirectiveParser.isElifNode = function (node) {
    return getIfNodeType(node) === 2;
};

IfDirectiveParser.isElseNode = function (node) {
    return getIfNodeType(node) === 3;
};

IfDirectiveParser.isIfEndNode = function (node) {
    return getIfNodeType(node) === 4;
};

IfDirectiveParser.findIfEnd = function (ifStartNode) {
    var curNode = ifStartNode;
    while ((curNode = curNode.nextSibling)) {
        if (IfDirectiveParser.isIfEndNode(curNode)) {
            return curNode;
        }
    }
};

module.exports = inherit(IfDirectiveParser, Parser);

function getIfNodeType(node) {
    if (node.nodeType !== 8) {
        return;
    }

    if (/^\s*if:\s*/.test(node.nodeValue)) {
        return 1;
    }

    if (/^\s*elif:\s*/.test(node.nodeValue)) {
        return 2;
    }

    if (/^\s*else:\s*/.test(node.nodeValue)) {
        return 3;
    }

    if (/^\s*\/if\s*/.test(node.nodeValue)) {
        return 4;
    }
}
