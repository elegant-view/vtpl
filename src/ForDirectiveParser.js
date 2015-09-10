/**
 * @file for 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var inherit = require('./inherit');
var Parser = require('./Parser');
var utils = require('./utils');

function ForDirectiveParser(options) {
    Parser.call(this, options);
}

ForDirectiveParser.prototype.initialize = function (options) {
    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;
    this.Tree = options.Tree;
};

ForDirectiveParser.prototype.collectExprs = function () {
    if (this.startNode.nextSibling === this.endNode) {
        return;
    }

    this.expr = this.startNode.nodeValue.match(/\s*for:\s*(\$\{[^{}]+\})/)[1];
    this.exprFn = utils.createExprFn(this.config.exprRegExp, this.expr);
    this.updateFn = createUpdateFn(
        this.Tree,
        this.startNode.nextSibling,
        this.endNode.previousSibling,
        this.config,
        this.startNode.nodeValue
    );
};

ForDirectiveParser.prototype.setData = function (data) {
    if (!this.expr) {
        return;
    }

    var exprValue = this.exprFn(data);
    if (exprValue !== this.exprOldValue) {
        this.updateFn(exprValue, data);
    }

    this.exprOldValue = exprValue;
};

ForDirectiveParser.isForNode = function (node) {
    return node.nodeType === 8 && /^\s*for:\s*/.test(node.nodeValue);
};

ForDirectiveParser.isForEndNode = function (node) {
    return node.nodeType === 8 && /^\s*\/for\s*/.test(node.nodeValue);
};

ForDirectiveParser.findForEnd = function (forStartNode) {
    var curNode = forStartNode;
    while ((curNode = curNode.nextSibling)) {
        if (ForDirectiveParser.isForEndNode(curNode)) {
            return curNode;
        }
    }
};

module.exports = inherit(ForDirectiveParser, Parser);

function createUpdateFn(Tree, startNode, endNode, config, fullExpr) {
    var trees = [];
    var itemVariableName = fullExpr.match(/as\s*\$\{([^{}]+)\}/)[1];
    return function (exprValue, data) {
        var index = 0;
        for (var k in exprValue) {
            if (!trees[index]) {
                trees[index] = createTree(Tree, startNode, endNode, config);
            }

            trees[index].restoreFromDark();

            var local = {
                key: k,
                index: index
            };
            local[itemVariableName] = exprValue[k];
            trees[index].setData(utils.extend({}, data, local));

            index++;
        }

        for (var i = index, il = trees.length; i < il; i++) {
            trees[i].goDark();
        }
    };
}

function createTree(Tree, startNode, endNode, config) {
    var tree = new Tree({
        startNode: startNode,
        endNode: endNode,
        config: config
    });
    tree.traverse();
    return tree;
}
