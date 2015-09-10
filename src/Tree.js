/**
 * @file 最终的树
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var IfDirectiveParser = require('./IfDirectiveParser');
var ExprParser = require('./ExprParser');
// var ForDirectiveParser = require('./ForDirectiveParser');
var utils = require('./utils');

function Tree(options) {
    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;

    this.tree = [];
}

Tree.prototype.traverse = function () {
    walk(this, this.startNode, this.endNode, this.tree);
};

Tree.prototype.setData = function (data) {
    walkParsers(this.tree, data);
};

Tree.prototype.goDark = function () {
    var curNode = this.startNode;
    do {
        if (curNode.nodeType === 1 || curNode.nodeType === 3) {
            utils.goDark(curNode);
        }
    } while ((curNode = curNode.nextSibling) && curNode !== this.endNode);
};

Tree.prototype.restoreFromDark = function () {
    var curNode = this.startNode;
    do {
        if (curNode.nodeType === 1 || curNode.nodeType === 3) {
            utils.restoreFromDark(curNode);
        }
    } while ((curNode = curNode.nextSibling) && curNode !== this.endNode);
};

exports.Tree = Tree;

function walkParsers(parsers, data) {
    for (var i = 0, il = parsers.length; i < il; i++) {
        var parserObj = parsers[i];
        parserObj.data = utils.extend({}, parserObj.data || {}, data);

        if (parserObj.parser instanceof IfDirectiveParser) {
            var branchIndex = parserObj.parser.setData(parserObj.data);
            var branches = parserObj.children;
            for (var j = 0, jl = branches.length; j < jl; j++) {
                if (j === branchIndex) {
                    walkParsers(branches[j], parserObj.data);
                    continue;
                }

                for (var z = 0, zl = branches[j].length; z < zl; z++) {
                    if (branches[j][z].parser instanceof ExprParser) {
                        branches[j][z].parser.goDark();
                    }
                }
            }
        }
        else {
            parserObj.parser.setData(parserObj.data);
            if (parserObj.children) {
                walkParsers(parserObj.children, parserObj.data);
            }
        }
    }
}

function walk(tree, startNode, endNode, container) {
    var curNode = startNode;
    do {
        if (!curNode) {
            break;
        }

        if (IfDirectiveParser.isIfNode(curNode)) {
            var ifEndNode = IfDirectiveParser.findIfEnd(curNode);
            if (!ifEndNode) {
                throw new Error('the if directive is not properly ended!');
            }

            var ifDirectiveParser = new IfDirectiveParser({
                startNode: curNode,
                endNode: ifEndNode,
                config: tree.config
            });

            var branches = ifDirectiveParser.collectExprs();
            container.push({parser: ifDirectiveParser, children: branches});
            for (var i = 0, il = branches.length; i < il; i++) {
                if (!branches[i].startNode || !branches[i].endNode) {
                    continue;
                }

                var ifCon = [];
                walk(tree, branches[i].startNode, branches[i].endNode, ifCon);
                branches[i] = ifCon;
            }

            curNode = ifEndNode.nextSibling;
            continue;
        }
        else if (ForDirectiveParser.isForNode(curNode)) {
            var forEndNode = ForDirectiveParser.findForEnd(curNode);
            if (!forEndNode) {
                throw new Error('the for directive is not properly ended!');
            }

            var forDirectiveParser = new ForDirectiveParser({
                startNode: curNode,
                endNode: forEndNode,
                config: tree.config
            });

            forDirectiveParser.collectExprs();
            container.push({parser: forDirectiveParser});

            curNode = forEndNode.nextSibling;
            continue;
        }
        else {
            var exprParser = new ExprParser({
                node: curNode,
                config: tree.config
            });
            exprParser.collectExprs();

            var con = [];
            container.push({parser: exprParser, children: con});
            if (curNode.nodeType === 1) {
                walk(tree, curNode.firstChild, curNode.lastChild, con);
            }
        }

        curNode = curNode.nextSibling;
    } while (curNode !== endNode);
}






var Parser = require('./Parser');
var utils = require('./utils');

function ForDirectiveParser(options) {
    Parser.call(this, options);
}

ForDirectiveParser.prototype.initialize = function (options) {
    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;
};

ForDirectiveParser.prototype.collectExprs = function () {
    if (this.startNode.nextSibling === this.endNode) {
        return;
    }

    this.expr = this.startNode.nodeValue.match(/\s*for:\s*(\$\{[^{}]+\})/)[1];
    this.exprFn = utils.createExprFn(this.config.exprRegExp, this.expr);
    this.updateFn = createUpdateFn(
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

// module.exports = inherit(ForDirectiveParser, Parser);

function createUpdateFn(startNode, endNode, config, fullExpr) {
    var trees = [];
    var itemVariableName = fullExpr.match(/as\s*\$\{([^{}]+)\}/)[1];
    return function (exprValue, data) {
        var index = 0;
        for (var k in exprValue) {
            if (!trees[index]) {
                trees[index] = createTree(startNode, endNode, config);
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

function createTree(startNode, endNode, config) {
    var tree = new Tree({
        startNode: startNode,
        endNode: endNode,
        config: config
    });
    tree.traverse();
    return tree;
}
