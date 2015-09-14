/**
 * @file 最终的树
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var utils = require('./utils');
var ExprCalculater = require('./ExprCalculater');
var DomUpdater = require('./DomUpdater');

function Tree(options) {
    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;

    this.exprCalculater = new ExprCalculater();
    this.domUpdater = new DomUpdater();

    this.tree = [];
}

Tree.prototype.traverse = function () {
    walk(this, this.startNode, this.endNode, this.tree);
};

Tree.prototype.setData = function (data, doneFn) {
    data = data || {};
    walkParsers(this, this.tree, data);
    this.domUpdater.executeTaskFns(doneFn);
};

Tree.prototype.goDark = function () {
    utils.traverseNoChangeNodes(this.startNode, this.endNode, function (curNode) {
        if (curNode.nodeType === 1 || curNode.nodeType === 3) {
            utils.goDark(curNode);
        }
    }, this);
};

Tree.prototype.restoreFromDark = function () {
    utils.traverseNoChangeNodes(this.startNode, this.endNode, function (curNode) {
        if (curNode.nodeType === 1 || curNode.nodeType === 3) {
            utils.restoreFromDark(curNode);
        }
    }, this);
};

Tree.prototype.setDirtyChecker = function (dirtyChecker) {
    this.dirtyChecker = dirtyChecker;
};

var ParserClasses = [];

/**
 * 注册一下解析器类。
 *
 * @param  {Constructor} ParserClass 解析器类
 */
Tree.registeParser = function (ParserClass) {
    var isExitsChildClass = false;
    utils.each(ParserClasses, function (PC, index) {
        if (utils.isSubClassOf(PC, ParserClass)) {
            isExitsChildClass = true;
        }
        else if (utils.isSubClassOf(ParserClass, PC)) {
            ParserClasses[index] = ParserClass;
            isExitsChildClass = true;
        }

        return isExitsChildClass;
    });

    if (!isExitsChildClass) {
        ParserClasses.push(ParserClass);
    }
};

module.exports = Tree;

function walkParsers(tree, parsers, data) {
    utils.each(parsers, function (parserObj) {
        parserObj.parser.setDirtyChecker(tree.dirtyChecker);
        parserObj.data = utils.extend({}, parserObj.data || {}, data);

        var result = parserObj.parser.setData(parserObj.data);
        if (utils.isNumber(result)) {
            var branchIndex = result;
            var branches = parserObj.children;

            utils.each(branches, function (branch, j) {
                if (j === branchIndex) {
                    tree.domUpdater.addTaskFn(utils.bind(hideParsers, null, branches[j]));
                    walkParsers(tree, branches[j], parserObj.data);
                    return;
                }

                tree.domUpdater.addTaskFn(utils.bind(showParserObjs, null, branch));
            }, this);
        }
        else if (parserObj.children) {
            walkParsers(tree, parserObj.children, parserObj.data);
        }
    }, this);

    function showParserObjs(parserObjs) {
        utils.each(parserObjs, function (parserObj) {
            parserObj.parser.goDark();
        });
    }

    function hideParsers(parsers) {
        utils.each(parsers, function (parser) {
            parser.restoreFromDark();
        });
    }
}

function walk(tree, startNode, endNode, container) {
    utils.traverseNoChangeNodes(startNode, endNode, function (curNode) {
        var options = {
            startNode: curNode,
            node: curNode,
            config: tree.config,
            exprCalculater: tree.exprCalculater,
            domUpdater: tree.domUpdater
        };

        var parserObj;

        utils.each(ParserClasses, function (ParserClass) {
            parserObj = createParser(ParserClass, options);
            if (!parserObj || !parserObj.parser) {
                return;
            }

            if (utils.isArray(parserObj.collectResult)) {
                var branches = parserObj.collectResult;
                container.push({parser: parserObj.parser, children: branches});
                utils.each(branches, function (branch, i) {
                    if (!branch.startNode || !branch.endNode) {
                        return;
                    }

                    var con = [];
                    walk(tree, branch.startNode, branch.endNode, con);
                    branches[i] = con;
                }, this);

                curNode = parserObj.endNode.nextSibling;
                return true;
            }

            var con = [];
            container.push({parser: parserObj.parser, children: con});
            if (curNode.nodeType === 1) {
                walk(tree, curNode.firstChild, curNode.lastChild, con);
            }

            curNode = curNode.nextSibling;

            return true;
        }, this);

        if (!parserObj) {
            curNode = curNode.nextSibling;
        }

        if (!curNode) {
            return true;
        }
    }, this);
}

/**
 * 创建解析器实例，其返回值的结构为：
 * {
 *     parser: ...,
 *     collectResult: ...
 * }
 *
 * 返回值存在如下几种情况：
 *
 * 1、如果 parser 属性存在且 collectResult 为 true ，则说明当前解析器解析了所有相应的节点（包括起止节点间的节点、当前节点和子孙节点）；
 * 2、直接返回假值或者 parser 不存在，说明没有处理任何节点，当前节点不属于当前解析器处理；
 * 3、parser 存在且 collectResult 为数组，结构如下：
 *     [
 *         {
 *             startNode: Node.<...>,
 *             endNode: Node.<...>
 *         }
 *     ]
 *
 *  则说明当前是带有很多分支的节点，要依次解析数组中每个元素指定的节点范围。
 *  而且，该解析器对应的 setData() 方法将会返回整数，指明使用哪一个分支的节点。
 *
 * @inner
 * @param {Constructor} ParserClass parser 类
 * @param  {Object} options 初始化参数
 * @return {Object}         返回值
 */
function createParser(ParserClass, options) {
    if (!ParserClass.isProperNode(options.startNode || options.node, options.config)) {
        return;
    }

    var endNode;
    if (ParserClass.findEndNode) {
        endNode = ParserClass.findEndNode(options.startNode || options.node, options.config);

        if (!endNode) {
            throw ParserClass.getNoEndNodeError();
        }
    }

    var parser = new ParserClass(utils.extend(options, {
        endNode: endNode
    }));

    return {
        parser: parser,
        collectResult: parser.collectExprs(),
        endNode: endNode || options.node
    };
}



