/**
 * @file for 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var inherit = require('../inherit');
var DirectiveParser = require('./DirectiveParser');
var utils = require('../utils');
var ForTree = require('../trees/ForTree');

function ForDirectiveParser(options) {
    DirectiveParser.call(this, options);
}

ForDirectiveParser.prototype.initialize = function (options) {
    DirectiveParser.prototype.initialize.apply(this, arguments);

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

ForDirectiveParser.prototype.onChange = function () {
    if (!this.expr) {
        return;
    }

    var exprValue = this.exprFn(this.scopeModel);
    if (this.dirtyCheck(this.expr, exprValue, this.exprOldValue)) {
        this.updateFn(exprValue, this.scopeModel);
    }

    this.exprOldValue = exprValue;

    DirectiveParser.prototype.onChange.apply(this, arguments);
};

ForDirectiveParser.prototype.destroy = function () {
    utils.traverseNodes(this.tplSeg.firstChild, this.tplSeg.lastChild, function (curNode) {
        this.endNode.parentNode.insertBefore(curNode, this.endNode);
    }, this);

    utils.each(this.trees, function (tree) {
        tree.destroy();
    });

    this.tplSeg = null;
    this.expr = null;
    this.exprFn = null;
    this.updateFn = null;
    this.startNode = null;
    this.endNode = null;
    DirectiveParser.prototype.destroy.call(this);
};

ForDirectiveParser.isProperNode = function (node, config) {
    return DirectiveParser.isProperNode(node, config)
        && config.forPrefixRegExp.test(node.nodeValue);
};

ForDirectiveParser.findEndNode = function (forStartNode, config) {
    var curNode = forStartNode;
    while ((curNode = curNode.nextSibling)) {
        if (isForEndNode(curNode, config)) {
            return curNode;
        }
    }
};

ForDirectiveParser.getNoEndNodeError = function () {
    return new Error('the for directive is not properly ended!');
};

module.exports = inherit(ForDirectiveParser, DirectiveParser);
ForTree.registeParser(module.exports);

function isForEndNode(node, config) {
    return node.nodeType === 8 && config.forEndPrefixRegExp.test(node.nodeValue);
}

function createUpdateFn(parser, startNode, endNode, config, fullExpr) {
    var trees = [];
    parser.trees = trees;
    var itemVariableName = fullExpr.match(parser.config.getForItemValueNameRegExp())[1];
    var taskId = parser.domUpdater.generateTaskId();
    return function (exprValue, scopeModel) {
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

            trees[index].rootScope.setParent(scopeModel);
            scopeModel.addChild(trees[index].rootScope);

            trees[index].setData(local);

            index++;
        }

        parser.domUpdater.addTaskFn(taskId, utils.bind(function (trees, index) {
            for (var i = index, il = trees.length; i < il; i++) {
                trees[i].goDark();
            }
        }, null, trees, index));
    };
}

function createTree(parser, config) {
    var copySeg = parser.tplSeg.cloneNode(true);
    var startNode = copySeg.firstChild;
    var endNode = copySeg.lastChild;
    utils.traverseNodes(startNode, endNode, function (curNode) {
        parser.endNode.parentNode.insertBefore(curNode, parser.endNode);
    });

    var tree = new ForTree({
        startNode: startNode,
        endNode: endNode,
        config: config,
        domUpdater: parser.tree.domUpdater,
        exprCalculater: parser.tree.exprCalculater,
        treeVars: parser.tree.treeVars,
        componentChildren: parser.tree.componentChildren,
        componentManager: parser.tree.componentManager
    });
    tree.traverse();
    return tree;
}
