/**
 * @file 最终的树
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var utils = require('../utils');
var ExprCalculater = require('../ExprCalculater');
var DomUpdater = require('../DomUpdater');
var ScopeModel = require('../ScopeModel');
var ComponentManager = require('../ComponentManager');

function Tree(options) {
    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;

    this.exprCalculater = options.exprCalculater || new ExprCalculater();
    this.domUpdater = options.domUpdater || new DomUpdater();
    this.componentManager = options.componentManager || new ComponentManager();
    this.dirtyChecker = options.dirtyChecker;

    this.tree = [];
    this.treeVars = options.treeVars || {};

    this.rootScope = new ScopeModel();
}

/**
 * 注册组件类
 *
 * @public
 * @param  {Map.<string, Component>} componentClasses 组件名和组件类的映射
 */
Tree.prototype.registeComponents = function (componentClasses) {
    if (!utils.isPureObject(componentClasses)) {
        return;
    }

    for (var name in componentClasses) {
        var componentClass = componentClasses[name];
        // 此处占用了组件类上的name属性，外部不要用这个属性
        componentClass.$name = name;
        this.componentManager.registe(componentClass);
    }
};

Tree.prototype.setTreeVar = function (name, value) {
    if (this.treeVars[name] !== undefined) {
        return false;
    }
    this.treeVars[name] = value;
    return true;
};

Tree.prototype.unsetTreeVar = function (name) {
    this.treeVars[name] = undefined;
};

Tree.prototype.getTreeVar = function (name) {
    return this.treeVars[name];
};

Tree.prototype.getScopeByName = function (name) {
    var scopes = this.getTreeVar('scopes');
    if (!scopes) {
        return;
    }
    return scopes[name];
};

Tree.prototype.traverse = function () {
    walkDom(this, this.startNode, this.endNode, this.tree, this.rootScope);
};

Tree.prototype.setData = function (data) {
    data = data || {};
    this.rootScope.set(data);
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

Tree.prototype.destroy = function () {
    walk(this.tree);

    this.startNode = null;
    this.endNode = null;
    this.config = null;

    this.exprCalculater.destroy();
    this.exprCalculater = null;

    this.domUpdater.destroy();
    this.domUpdater = null;

    this.tree = null;
    this.treeVars = null;

    if (this.dirtyChecker) {
        this.dirtyChecker.destroy();
        this.dirtyChecker = null;
    }

    function walk(parserObjs) {
        utils.each(parserObjs, function (curParserObj) {
            curParserObj.parser.destroy();

            if (curParserObj.children && curParserObj.children.length) {
                walk(curParserObj.children);
            }
        });
    }
};

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
Tree.prototype.createParser = function (ParserClass, options) {
    var startNode = options.startNode || options.node;
    if (!ParserClass.isProperNode(startNode, options.config)) {
        return;
    }

    var endNode;
    if (ParserClass.findEndNode) {
        endNode = ParserClass.findEndNode(startNode, options.config);

        if (!endNode) {
            throw ParserClass.getNoEndNodeError();
        }
        else if (endNode.parentNode !== startNode.parentNode) {
            throw new Error('the relationship between start node and end node is not brotherhood!');
        }
    }

    var parser = new ParserClass(utils.extend(options, {
        endNode: endNode
    }));

    return {
        parser: parser,
        endNode: endNode || options.node
    };
};

module.exports = Tree;

function walkDom(tree, startNode, endNode, container, scopeModel) {
    if (startNode === endNode) {
        add(startNode);
        return;
    }

    for (var curNode = startNode; curNode;) {
        curNode = add(curNode);
    }

    function add(curNode) {
        var options = {
            startNode: curNode,
            node: curNode,
            config: tree.config,
            exprCalculater: tree.exprCalculater,
            domUpdater: tree.domUpdater,
            tree: tree
        };

        var parserObj;

        utils.each(ParserClasses, function (ParserClass) {
            parserObj = tree.createParser(ParserClass, options);
            if (!parserObj || !parserObj.parser) {
                return;
            }
            parserObj.collectResult = parserObj.parser.collectExprs();

            parserObj.parser.setScope(scopeModel);

            if (utils.isArray(parserObj.collectResult)) {
                var branches = parserObj.collectResult;
                container.push({parser: parserObj.parser, children: branches});
                utils.each(branches, function (branch, i) {
                    if (!branch.startNode || !branch.endNode) {
                        return;
                    }

                    var con = [];
                    walkDom(tree, branch.startNode, branch.endNode, con, parserObj.parser.getScope());
                    branches[i] = con;
                }, this);

                if (parserObj.endNode !== endNode) {
                    curNode = parserObj.parser.getEndNode().nextSibling;
                }
                else {
                    curNode = null;
                }
            }
            else {
                var con = [];
                container.push({parser: parserObj.parser, children: con});
                if (curNode.nodeType === 1 && curNode.childNodes.length) {
                    walkDom(tree, curNode.firstChild, curNode.lastChild, con, parserObj.parser.getScope());
                }

                if (curNode !== endNode) {
                    curNode = parserObj.parser.getEndNode().nextSibling;
                }
                else {
                    curNode = null;
                }
            }

            return true;
        }, this);

        if (!parserObj) {
            curNode = curNode.nextSibling;
        }

        return curNode;
    }
}




