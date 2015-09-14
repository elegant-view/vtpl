/**
 * @file for 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var inherit = require('./inherit');
var Parser = require('./Parser');
var utils = require('./utils');
var Tree = require('./Tree');

function ForDirectiveParser(options) {
    Parser.call(this, options);
}

ForDirectiveParser.prototype.initialize = function (options) {
    Parser.prototype.initialize.apply(this, arguments);

    this.startNode = options.startNode;
    this.endNode = options.endNode;
};

ForDirectiveParser.prototype.collectExprs = function () {
    if (this.startNode.nextSibling === this.endNode) {
        return;
    }

    var tplSeg = document.createElement('div');
    utils.traverseNodes(this.startNode, this.endNode, function (curNode) {
        if (curNode === this.startNode || curNode === this.endNode) {
            return;
        }

        tplSeg.appendChild(curNode);
    }, this);
    this.tplSeg = tplSeg;

    this.expr = this.startNode.nodeValue.match(this.config.getForExprsRegExp())[1];
    this.exprFn = utils.createExprFn(this.config.getExprRegExp(), this.expr, this.exprCalculater);
    this.updateFn = createUpdateFn(
        this,
        this.startNode.nextSibling,
        this.endNode.previousSibling,
        this.config,
        this.startNode.nodeValue
    );

    return true;
};

ForDirectiveParser.prototype.setData = function (data) {
    if (!this.expr) {
        return;
    }

    var exprValue = this.exprFn(data);
    if (this.dirtyCheck(this.expr, exprValue, this.exprOldValue)) {
        this.updateFn(exprValue, data);
    }

    this.exprOldValue = exprValue;
};

ForDirectiveParser.isProperNode = ForDirectiveParser.isForNode = function (node, config) {
    return node.nodeType === 8 && config.forPrefixRegExp.test(node.nodeValue);
};

ForDirectiveParser.isForEndNode = function (node, config) {
    return node.nodeType === 8 && config.forEndPrefixRegExp.test(node.nodeValue);
};

ForDirectiveParser.findEndNode = ForDirectiveParser.findForEnd = function (forStartNode, config) {
    var curNode = forStartNode;
    while ((curNode = curNode.nextSibling)) {
        if (ForDirectiveParser.isForEndNode(curNode, config)) {
            return curNode;
        }
    }
};

ForDirectiveParser.getNoEndNodeError = function () {
    return new Error('the for directive is not properly ended!');
};

module.exports = inherit(ForDirectiveParser, Parser);
Tree.registeParser(module.exports);

function createUpdateFn(parser, startNode, endNode, config, fullExpr) {
    var trees = [];
    var itemVariableName = fullExpr.match(parser.config.getForItemValueNameRegExp())[1];
    return function (exprValue, data) {
        var index = 0;
        for (var k in exprValue) {
            if (!trees[index]) {
                trees[index] = createTree(parser, config);
            }

            trees[index].restoreFromDark();
            trees[index].setDirtyChecker(parser.dirtyChecker);

            var local = {
                key: k,
                index: index
            };
            local[itemVariableName] = exprValue[k];
            trees[index].setData(utils.extend({}, data, local));

            index++;
        }

        for (var i = index, il = trees.length; i < il; i++) {
            parser.domUpdater.addTaskFn((function (tree) {
                return function () {
                    tree.goDark();
                };
            })(trees[i]));
        }
    };
}

function createTree(parser, config) {
    var copySeg = parser.tplSeg.cloneNode(true);
    var startNode = copySeg.firstChild;
    var endNode = copySeg.lastChild;
    utils.traverseNodes(startNode, endNode, function (curNode) {
        parser.endNode.parentNode.insertBefore(curNode, parser.endNode);
    });

    var tree = new Tree({
        startNode: startNode,
        endNode: endNode,
        config: config
    });
    tree.traverse();
    return tree;
}
