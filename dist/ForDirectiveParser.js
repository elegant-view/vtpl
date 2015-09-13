(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var utils = require('./utils');

function ExprCalculater() {
    this.fns = {};

    this.exprNameMap = {};
    this.exprNameRegExp = /\.?\$?([a-z|A-Z]+|([a-z|A-Z]+[0-9]+[a-z|A-Z]*))/g;
}

ExprCalculater.prototype.createExprFn = function (expr, avoidReturn) {
    avoidReturn = !!avoidReturn;
    this.fns[expr] = this.fns[expr] || {};
    if (this.fns[expr][avoidReturn]) {
        return;
    }

    var params = getVariableNamesFromExpr(this, expr);
    var fn = new Function(params, (avoidReturn ? '' : 'return ') + expr);

    this.fns[expr][avoidReturn] = {
        paramNames: params,
        fn: fn
    };
};

ExprCalculater.prototype.calculate = function (expr, avoidReturn, data) {
    var fnObj = this.fns[expr][avoidReturn];
    if (!fnObj) {
        throw new Error('no such expression function created!');
    }

    var fnArgs = [];
    for (var i = 0, il = fnObj.paramNames.length; i < il; i++) {
        var param = fnObj.paramNames[i];
        var value = data[param];
        fnArgs.push(value === undefined ? '' : value);
    }

    var result;
    try {
        result = fnObj.fn.apply(null, fnArgs);
    }
    catch (e) {
        result = '';
    }
    return result;
};

module.exports = ExprCalculater;

/**
 * 从表达式中抽离出变量名
 *
 * @inner
 * @param {ExprCalculater} me 对应实例
 * @param  {string} expr 表达式字符串，类似于 `${name}` 中的 name
 * @return {Array.<string>}      变量名数组
 */
function getVariableNamesFromExpr(me, expr) {
    if (me.exprNameMap[expr]) {
        return me.exprNameMap[expr];
    }

    var matches = expr.match(me.exprNameRegExp) || [];
    var names = {};
    for (var i = 0, il = matches.length; i < il; i++) {
        if (matches[i] && matches[i][0] !== '.') {
            names[matches[i]] = true;
        }
    }

    var ret = [];
    utils.each(names, function (isOk, name) {
        if (isOk) {
            ret.push(name);
        }
    });
    me.exprNameMap[expr] = ret;

    return ret;
}

},{"./utils":6}],2:[function(require,module,exports){
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
            trees[i].goDark();
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

},{"./Parser":3,"./Tree":4,"./inherit":5,"./utils":6}],3:[function(require,module,exports){
/**
 * @file 解析器的抽象基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

/**
 * 构造函数
 *
 * @constructor
 * @param {Object} options 配置参数，一般可能会有如下内容：
 *                         {
 *                             startNode: ...,
 *                             endNode: ...,
 *                             node: ...,
 *                             config: ...
 *                         }
 *                         具体是啥可以参加具体的子类
 */
function Parser(options) {
    this.initialize(options);
}

/**
 * 初始化
 *
 * @protectedß
 * @param {Object} options 来自于构造函数
 */
Parser.prototype.initialize = function (options) {
    this.exprCalculater = options.exprCalculater;
    this.config = options.config;
};

/**
 * 销毁解析器
 *
 * @public
 * @abstract
 */
Parser.prototype.destroy = function () {};

/**
 * 设置数据
 *
 * @public
 * @abstract
 * @param {Object} data 要设置的数据
 */
Parser.prototype.setData = function (data) {};

/**
 * 隐藏相关元素
 *
 * @public
 */
Parser.prototype.goDark = function () {};

/**
 * 显示相关元素
 *
 * @public
 */
Parser.prototype.restoreFromDark = function () {};

/**
 * 搜集表达式，生成表达式函数和 DOM 更新函数
 *
 * @abstract
 * @public
 */
Parser.prototype.collectExprs = function () {};

Parser.prototype.dirtyCheck = function (expr, exprValue, exprOldValue) {
    var dirtyCheckerFn = this.dirtyChecker ? this.dirtyChecker.getChecker(expr) : null;
    return (dirtyCheckerFn && dirtyCheckerFn(expr, exprValue, exprOldValue))
            || (!dirtyCheckerFn && exprValue !== exprOldValue);
};

Parser.prototype.setDirtyChecker = function (dirtyChecker) {
    this.dirtyChecker = dirtyChecker;
};

module.exports = Parser;

},{}],4:[function(require,module,exports){
/**
 * @file 最终的树
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var utils = require('./utils');
var ExprCalculater = require('./ExprCalculater');

function Tree(options) {
    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;
    this.exprCalculater = new ExprCalculater();

    this.tree = [];
}

Tree.prototype.traverse = function () {
    walk(this, this.startNode, this.endNode, this.tree);
};

Tree.prototype.setData = function (data) {
    data = data || {};
    walkParsers(this, this.tree, data);
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
window.ParserClasses = ParserClasses;

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
    for (var i = 0, il = parsers.length; i < il; i++) {
        var parserObj = parsers[i];
        parserObj.parser.setDirtyChecker(tree.dirtyChecker);
        parserObj.data = utils.extend({}, parserObj.data || {}, data);

        parserObj.parser.restoreFromDark();
        var result = parserObj.parser.setData(parserObj.data);
        if (utils.isNumber(result)) {
            var branchIndex = result;
            var branches = parserObj.children;
            for (var j = 0, jl = branches.length; j < jl; j++) {
                if (j === branchIndex) {
                    walkParsers(tree, branches[j], parserObj.data);
                    continue;
                }

                for (var z = 0, zl = branches[j].length; z < zl; z++) {
                    branches[j][z].parser.goDark();
                }
            }
        }
        else if (parserObj.children) {
            walkParsers(tree, parserObj.children, parserObj.data);
        }
    }
}

function walk(tree, startNode, endNode, container) {
    utils.traverseNoChangeNodes(startNode, endNode, function (curNode) {
        if (!curNode) {
            return true;
        }

        var options = {
            startNode: curNode,
            node: curNode,
            config: tree.config,
            exprCalculater: tree.exprCalculater
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




},{"./ExprCalculater":1,"./utils":6}],5:[function(require,module,exports){
/**
 * @file 继承
 * @author yibuyisheng(yibuyisheng@163.com)
 */

function inherit(ChildClass, ParentClass) {
    var childProto = ChildClass.prototype;
    ChildClass.prototype = new ParentClass({});

    var key;
    for (key in childProto) {
        if (childProto.hasOwnProperty(key)) {
            ChildClass.prototype[key] = childProto[key];
        }
    }

    // 继承静态属性
    for (key in ParentClass) {
        if (ParentClass.hasOwnProperty(key)) {
            if (ChildClass[key] === undefined) {
                ChildClass[key] = ParentClass[key];
            }
        }
    }

    return ChildClass;
}

module.exports = inherit;

// module.exports = function (subClass, superClass) {
//     var Empty = function () {};
//     Empty.prototype = superClass.prototype;
//     var selfPrototype = subClass.prototype;
//     var proto = subClass.prototype = new Empty();

//     for (var key in selfPrototype) {
//         proto[key] = selfPrototype[key];
//     }
//     subClass.prototype.constructor = subClass;
//     subClass.superClass = superClass.prototype;

//     return subClass;
// };

},{}],6:[function(require,module,exports){
/**
 * @file 一堆项目里面常用的方法
 * @author yibuyisheng(yibuyisheng@163.com)
 */

exports.slice = function (arr, start, end) {
    return Array.prototype.slice.call(arr, start, end);
};

exports.goDark = function (node) {
    if (node.nodeType === 1) {
        node.style.display = 'none';
    }
    else if (node.nodeType === 3) {
        node.__text__ = node.nodeValue;
        node.nodeValue = '';
    }
};

exports.restoreFromDark = function (node) {
    if (node.nodeType === 1) {
        node.style.display = null;
    }
    else if (node.nodeType === 3) {
        if (node.__text__ !== undefined) {
            node.nodeValue = node.__text__;
            node.__text__ = undefined;
        }
    }
};

exports.createExprFn = function (exprRegExp, expr, exprCalculater) {
    expr = expr.replace(exprRegExp, function () {
        return arguments[1];
    });
    exprCalculater.createExprFn(expr);

    return function (data) {
        return exprCalculater.calculate(expr, false, data);
    };
};

/**
 * 超级简单的 extend ，因为本库对 extend 没那高的要求，
 * 等到有要求的时候再完善。
 *
 * @inner
 * @param  {Object} target 目标对象
 * @return {Object}        最终合并后的对象
 */
exports.extend = function (target) {
    var srcs = exports.slice(arguments, 1);
    for (var i = 0, il = srcs.length; i < il; i++) {
        /* eslint-disable guard-for-in */
        for (var key in srcs[i]) {
            target[key] = srcs[i][key];
        }
        /* eslint-enable guard-for-in */
    }
    return target;
};

exports.traverseNoChangeNodes = function (startNode, endNode, nodeFn, context) {
    for (var curNode = startNode;
        curNode && curNode !== endNode;
        curNode = curNode.nextSibling
    ) {
        if (nodeFn.call(context, curNode)) {
            return;
        }
    }

    nodeFn.call(context, endNode);
};

exports.traverseNodes = function (startNode, endNode, nodeFn, context) {
    var nodes = [];
    for (var curNode = startNode;
        curNode && curNode !== endNode;
        curNode = curNode.nextSibling
    ) {
        nodes.push(curNode);
    }

    nodes.push(endNode);

    exports.each(nodes, nodeFn, context);
};

exports.each = function (arr, fn, context) {
    if (exports.isArray(arr)) {
        for (var i = 0, il = arr.length; i < il; i++) {
            if (fn.call(context, arr[i], i, arr)) {
                break;
            }
        }
    }
    else if (typeof arr === 'object') {
        for (var k in arr) {
            if (fn.call(context, arr[k], k, arr)) {
                break;
            }
        }
    }
};

exports.isArray = function (arr) {
    return Object.prototype.toString.call(arr) === '[object Array]';
};

exports.isNumber = function (obj) {
    return Object.prototype.toString.call(obj) === '[object Number]';
};

exports.isSubClassOf = function (SubClass, SuperClass) {
    return SubClass.prototype instanceof SuperClass;
};

},{}],7:[function(require,module,exports){
window.ForDirectiveParser = module.exports = require('../src/ForDirectiveParser.js');
},{"../src/ForDirectiveParser.js":2}]},{},[7])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9FeHByQ2FsY3VsYXRlci5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9Gb3JEaXJlY3RpdmVQYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvUGFyc2VyLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL1RyZWUuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvaW5oZXJpdC5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3RtcC9mYWtlXzZkZDNlMGYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBFeHByQ2FsY3VsYXRlcigpIHtcbiAgICB0aGlzLmZucyA9IHt9O1xuXG4gICAgdGhpcy5leHByTmFtZU1hcCA9IHt9O1xuICAgIHRoaXMuZXhwck5hbWVSZWdFeHAgPSAvXFwuP1xcJD8oW2EtenxBLVpdK3woW2EtenxBLVpdK1swLTldK1thLXp8QS1aXSopKS9nO1xufVxuXG5FeHByQ2FsY3VsYXRlci5wcm90b3R5cGUuY3JlYXRlRXhwckZuID0gZnVuY3Rpb24gKGV4cHIsIGF2b2lkUmV0dXJuKSB7XG4gICAgYXZvaWRSZXR1cm4gPSAhIWF2b2lkUmV0dXJuO1xuICAgIHRoaXMuZm5zW2V4cHJdID0gdGhpcy5mbnNbZXhwcl0gfHwge307XG4gICAgaWYgKHRoaXMuZm5zW2V4cHJdW2F2b2lkUmV0dXJuXSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHBhcmFtcyA9IGdldFZhcmlhYmxlTmFtZXNGcm9tRXhwcih0aGlzLCBleHByKTtcbiAgICB2YXIgZm4gPSBuZXcgRnVuY3Rpb24ocGFyYW1zLCAoYXZvaWRSZXR1cm4gPyAnJyA6ICdyZXR1cm4gJykgKyBleHByKTtcblxuICAgIHRoaXMuZm5zW2V4cHJdW2F2b2lkUmV0dXJuXSA9IHtcbiAgICAgICAgcGFyYW1OYW1lczogcGFyYW1zLFxuICAgICAgICBmbjogZm5cbiAgICB9O1xufTtcblxuRXhwckNhbGN1bGF0ZXIucHJvdG90eXBlLmNhbGN1bGF0ZSA9IGZ1bmN0aW9uIChleHByLCBhdm9pZFJldHVybiwgZGF0YSkge1xuICAgIHZhciBmbk9iaiA9IHRoaXMuZm5zW2V4cHJdW2F2b2lkUmV0dXJuXTtcbiAgICBpZiAoIWZuT2JqKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gc3VjaCBleHByZXNzaW9uIGZ1bmN0aW9uIGNyZWF0ZWQhJyk7XG4gICAgfVxuXG4gICAgdmFyIGZuQXJncyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGZuT2JqLnBhcmFtTmFtZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICB2YXIgcGFyYW0gPSBmbk9iai5wYXJhbU5hbWVzW2ldO1xuICAgICAgICB2YXIgdmFsdWUgPSBkYXRhW3BhcmFtXTtcbiAgICAgICAgZm5BcmdzLnB1c2godmFsdWUgPT09IHVuZGVmaW5lZCA/ICcnIDogdmFsdWUpO1xuICAgIH1cblxuICAgIHZhciByZXN1bHQ7XG4gICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gZm5PYmouZm4uYXBwbHkobnVsbCwgZm5BcmdzKTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVzdWx0ID0gJyc7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV4cHJDYWxjdWxhdGVyO1xuXG4vKipcbiAqIOS7juihqOi+vuW8j+S4reaKveemu+WHuuWPmOmHj+WQjVxuICpcbiAqIEBpbm5lclxuICogQHBhcmFtIHtFeHByQ2FsY3VsYXRlcn0gbWUg5a+55bqU5a6e5L6LXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV4cHIg6KGo6L6+5byP5a2X56ym5Liy77yM57G75Ly85LqOIGAke25hbWV9YCDkuK3nmoQgbmFtZVxuICogQHJldHVybiB7QXJyYXkuPHN0cmluZz59ICAgICAg5Y+Y6YeP5ZCN5pWw57uEXG4gKi9cbmZ1bmN0aW9uIGdldFZhcmlhYmxlTmFtZXNGcm9tRXhwcihtZSwgZXhwcikge1xuICAgIGlmIChtZS5leHByTmFtZU1hcFtleHByXSkge1xuICAgICAgICByZXR1cm4gbWUuZXhwck5hbWVNYXBbZXhwcl07XG4gICAgfVxuXG4gICAgdmFyIG1hdGNoZXMgPSBleHByLm1hdGNoKG1lLmV4cHJOYW1lUmVnRXhwKSB8fCBbXTtcbiAgICB2YXIgbmFtZXMgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBtYXRjaGVzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgaWYgKG1hdGNoZXNbaV0gJiYgbWF0Y2hlc1tpXVswXSAhPT0gJy4nKSB7XG4gICAgICAgICAgICBuYW1lc1ttYXRjaGVzW2ldXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgcmV0ID0gW107XG4gICAgdXRpbHMuZWFjaChuYW1lcywgZnVuY3Rpb24gKGlzT2ssIG5hbWUpIHtcbiAgICAgICAgaWYgKGlzT2spIHtcbiAgICAgICAgICAgIHJldC5wdXNoKG5hbWUpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgbWUuZXhwck5hbWVNYXBbZXhwcl0gPSByZXQ7XG5cbiAgICByZXR1cm4gcmV0O1xufVxuIiwiLyoqXG4gKiBAZmlsZSBmb3Ig5oyH5LukXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxudmFyIGluaGVyaXQgPSByZXF1aXJlKCcuL2luaGVyaXQnKTtcbnZhciBQYXJzZXIgPSByZXF1aXJlKCcuL1BhcnNlcicpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIFRyZWUgPSByZXF1aXJlKCcuL1RyZWUnKTtcblxuZnVuY3Rpb24gRm9yRGlyZWN0aXZlUGFyc2VyKG9wdGlvbnMpIHtcbiAgICBQYXJzZXIuY2FsbCh0aGlzLCBvcHRpb25zKTtcbn1cblxuRm9yRGlyZWN0aXZlUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBQYXJzZXIucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHRoaXMuc3RhcnROb2RlID0gb3B0aW9ucy5zdGFydE5vZGU7XG4gICAgdGhpcy5lbmROb2RlID0gb3B0aW9ucy5lbmROb2RlO1xufTtcblxuRm9yRGlyZWN0aXZlUGFyc2VyLnByb3RvdHlwZS5jb2xsZWN0RXhwcnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuc3RhcnROb2RlLm5leHRTaWJsaW5nID09PSB0aGlzLmVuZE5vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciB0cGxTZWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB1dGlscy50cmF2ZXJzZU5vZGVzKHRoaXMuc3RhcnROb2RlLCB0aGlzLmVuZE5vZGUsIGZ1bmN0aW9uIChjdXJOb2RlKSB7XG4gICAgICAgIGlmIChjdXJOb2RlID09PSB0aGlzLnN0YXJ0Tm9kZSB8fCBjdXJOb2RlID09PSB0aGlzLmVuZE5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRwbFNlZy5hcHBlbmRDaGlsZChjdXJOb2RlKTtcbiAgICB9LCB0aGlzKTtcbiAgICB0aGlzLnRwbFNlZyA9IHRwbFNlZztcblxuICAgIHRoaXMuZXhwciA9IHRoaXMuc3RhcnROb2RlLm5vZGVWYWx1ZS5tYXRjaCh0aGlzLmNvbmZpZy5nZXRGb3JFeHByc1JlZ0V4cCgpKVsxXTtcbiAgICB0aGlzLmV4cHJGbiA9IHV0aWxzLmNyZWF0ZUV4cHJGbih0aGlzLmNvbmZpZy5nZXRFeHByUmVnRXhwKCksIHRoaXMuZXhwciwgdGhpcy5leHByQ2FsY3VsYXRlcik7XG4gICAgdGhpcy51cGRhdGVGbiA9IGNyZWF0ZVVwZGF0ZUZuKFxuICAgICAgICB0aGlzLFxuICAgICAgICB0aGlzLnN0YXJ0Tm9kZS5uZXh0U2libGluZyxcbiAgICAgICAgdGhpcy5lbmROb2RlLnByZXZpb3VzU2libGluZyxcbiAgICAgICAgdGhpcy5jb25maWcsXG4gICAgICAgIHRoaXMuc3RhcnROb2RlLm5vZGVWYWx1ZVxuICAgICk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbkZvckRpcmVjdGl2ZVBhcnNlci5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKCF0aGlzLmV4cHIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBleHByVmFsdWUgPSB0aGlzLmV4cHJGbihkYXRhKTtcbiAgICBpZiAodGhpcy5kaXJ0eUNoZWNrKHRoaXMuZXhwciwgZXhwclZhbHVlLCB0aGlzLmV4cHJPbGRWYWx1ZSkpIHtcbiAgICAgICAgdGhpcy51cGRhdGVGbihleHByVmFsdWUsIGRhdGEpO1xuICAgIH1cblxuICAgIHRoaXMuZXhwck9sZFZhbHVlID0gZXhwclZhbHVlO1xufTtcblxuRm9yRGlyZWN0aXZlUGFyc2VyLmlzUHJvcGVyTm9kZSA9IEZvckRpcmVjdGl2ZVBhcnNlci5pc0Zvck5vZGUgPSBmdW5jdGlvbiAobm9kZSwgY29uZmlnKSB7XG4gICAgcmV0dXJuIG5vZGUubm9kZVR5cGUgPT09IDggJiYgY29uZmlnLmZvclByZWZpeFJlZ0V4cC50ZXN0KG5vZGUubm9kZVZhbHVlKTtcbn07XG5cbkZvckRpcmVjdGl2ZVBhcnNlci5pc0ZvckVuZE5vZGUgPSBmdW5jdGlvbiAobm9kZSwgY29uZmlnKSB7XG4gICAgcmV0dXJuIG5vZGUubm9kZVR5cGUgPT09IDggJiYgY29uZmlnLmZvckVuZFByZWZpeFJlZ0V4cC50ZXN0KG5vZGUubm9kZVZhbHVlKTtcbn07XG5cbkZvckRpcmVjdGl2ZVBhcnNlci5maW5kRW5kTm9kZSA9IEZvckRpcmVjdGl2ZVBhcnNlci5maW5kRm9yRW5kID0gZnVuY3Rpb24gKGZvclN0YXJ0Tm9kZSwgY29uZmlnKSB7XG4gICAgdmFyIGN1ck5vZGUgPSBmb3JTdGFydE5vZGU7XG4gICAgd2hpbGUgKChjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZykpIHtcbiAgICAgICAgaWYgKEZvckRpcmVjdGl2ZVBhcnNlci5pc0ZvckVuZE5vZGUoY3VyTm9kZSwgY29uZmlnKSkge1xuICAgICAgICAgICAgcmV0dXJuIGN1ck5vZGU7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5Gb3JEaXJlY3RpdmVQYXJzZXIuZ2V0Tm9FbmROb2RlRXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBFcnJvcigndGhlIGZvciBkaXJlY3RpdmUgaXMgbm90IHByb3Blcmx5IGVuZGVkIScpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0KEZvckRpcmVjdGl2ZVBhcnNlciwgUGFyc2VyKTtcblRyZWUucmVnaXN0ZVBhcnNlcihtb2R1bGUuZXhwb3J0cyk7XG5cbmZ1bmN0aW9uIGNyZWF0ZVVwZGF0ZUZuKHBhcnNlciwgc3RhcnROb2RlLCBlbmROb2RlLCBjb25maWcsIGZ1bGxFeHByKSB7XG4gICAgdmFyIHRyZWVzID0gW107XG4gICAgdmFyIGl0ZW1WYXJpYWJsZU5hbWUgPSBmdWxsRXhwci5tYXRjaChwYXJzZXIuY29uZmlnLmdldEZvckl0ZW1WYWx1ZU5hbWVSZWdFeHAoKSlbMV07XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChleHByVmFsdWUsIGRhdGEpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gMDtcbiAgICAgICAgZm9yICh2YXIgayBpbiBleHByVmFsdWUpIHtcbiAgICAgICAgICAgIGlmICghdHJlZXNbaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgdHJlZXNbaW5kZXhdID0gY3JlYXRlVHJlZShwYXJzZXIsIGNvbmZpZyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRyZWVzW2luZGV4XS5yZXN0b3JlRnJvbURhcmsoKTtcbiAgICAgICAgICAgIHRyZWVzW2luZGV4XS5zZXREaXJ0eUNoZWNrZXIocGFyc2VyLmRpcnR5Q2hlY2tlcik7XG5cbiAgICAgICAgICAgIHZhciBsb2NhbCA9IHtcbiAgICAgICAgICAgICAgICBrZXk6IGssXG4gICAgICAgICAgICAgICAgaW5kZXg6IGluZGV4XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgbG9jYWxbaXRlbVZhcmlhYmxlTmFtZV0gPSBleHByVmFsdWVba107XG4gICAgICAgICAgICB0cmVlc1tpbmRleF0uc2V0RGF0YSh1dGlscy5leHRlbmQoe30sIGRhdGEsIGxvY2FsKSk7XG5cbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBpID0gaW5kZXgsIGlsID0gdHJlZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgdHJlZXNbaV0uZ29EYXJrKCk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVUcmVlKHBhcnNlciwgY29uZmlnKSB7XG4gICAgdmFyIGNvcHlTZWcgPSBwYXJzZXIudHBsU2VnLmNsb25lTm9kZSh0cnVlKTtcbiAgICB2YXIgc3RhcnROb2RlID0gY29weVNlZy5maXJzdENoaWxkO1xuICAgIHZhciBlbmROb2RlID0gY29weVNlZy5sYXN0Q2hpbGQ7XG4gICAgdXRpbHMudHJhdmVyc2VOb2RlcyhzdGFydE5vZGUsIGVuZE5vZGUsIGZ1bmN0aW9uIChjdXJOb2RlKSB7XG4gICAgICAgIHBhcnNlci5lbmROb2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGN1ck5vZGUsIHBhcnNlci5lbmROb2RlKTtcbiAgICB9KTtcblxuICAgIHZhciB0cmVlID0gbmV3IFRyZWUoe1xuICAgICAgICBzdGFydE5vZGU6IHN0YXJ0Tm9kZSxcbiAgICAgICAgZW5kTm9kZTogZW5kTm9kZSxcbiAgICAgICAgY29uZmlnOiBjb25maWdcbiAgICB9KTtcbiAgICB0cmVlLnRyYXZlcnNlKCk7XG4gICAgcmV0dXJuIHRyZWU7XG59XG4iLCIvKipcbiAqIEBmaWxlIOino+aekOWZqOeahOaKveixoeWfuuexu1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbi8qKlxuICog5p6E6YCg5Ye95pWwXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDphY3nva7lj4LmlbDvvIzkuIDoiKzlj6/og73kvJrmnInlpoLkuIvlhoXlrrnvvJpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydE5vZGU6IC4uLixcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmROb2RlOiAuLi4sXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogLi4uLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZzogLi4uXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICDlhbfkvZPmmK/llaXlj6/ku6Xlj4LliqDlhbfkvZPnmoTlrZDnsbtcbiAqL1xuZnVuY3Rpb24gUGFyc2VyKG9wdGlvbnMpIHtcbiAgICB0aGlzLmluaXRpYWxpemUob3B0aW9ucyk7XG59XG5cbi8qKlxuICog5Yid5aeL5YyWXG4gKlxuICogQHByb3RlY3RlZMOfXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDmnaXoh6rkuo7mnoTpgKDlh73mlbBcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB0aGlzLmV4cHJDYWxjdWxhdGVyID0gb3B0aW9ucy5leHByQ2FsY3VsYXRlcjtcbiAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xufTtcblxuLyoqXG4gKiDplIDmr4Hop6PmnpDlmahcbiAqXG4gKiBAcHVibGljXG4gKiBAYWJzdHJhY3RcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge307XG5cbi8qKlxuICog6K6+572u5pWw5o2uXG4gKlxuICogQHB1YmxpY1xuICogQGFic3RyYWN0XG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSDopoHorr7nva7nmoTmlbDmja5cbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHt9O1xuXG4vKipcbiAqIOmakOiXj+ebuOWFs+WFg+e0oFxuICpcbiAqIEBwdWJsaWNcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5nb0RhcmsgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDmmL7npLrnm7jlhbPlhYPntKBcbiAqXG4gKiBAcHVibGljXG4gKi9cblBhcnNlci5wcm90b3R5cGUucmVzdG9yZUZyb21EYXJrID0gZnVuY3Rpb24gKCkge307XG5cbi8qKlxuICog5pCc6ZuG6KGo6L6+5byP77yM55Sf5oiQ6KGo6L6+5byP5Ye95pWw5ZKMIERPTSDmm7TmlrDlh73mlbBcbiAqXG4gKiBAYWJzdHJhY3RcbiAqIEBwdWJsaWNcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5jb2xsZWN0RXhwcnMgPSBmdW5jdGlvbiAoKSB7fTtcblxuUGFyc2VyLnByb3RvdHlwZS5kaXJ0eUNoZWNrID0gZnVuY3Rpb24gKGV4cHIsIGV4cHJWYWx1ZSwgZXhwck9sZFZhbHVlKSB7XG4gICAgdmFyIGRpcnR5Q2hlY2tlckZuID0gdGhpcy5kaXJ0eUNoZWNrZXIgPyB0aGlzLmRpcnR5Q2hlY2tlci5nZXRDaGVja2VyKGV4cHIpIDogbnVsbDtcbiAgICByZXR1cm4gKGRpcnR5Q2hlY2tlckZuICYmIGRpcnR5Q2hlY2tlckZuKGV4cHIsIGV4cHJWYWx1ZSwgZXhwck9sZFZhbHVlKSlcbiAgICAgICAgICAgIHx8ICghZGlydHlDaGVja2VyRm4gJiYgZXhwclZhbHVlICE9PSBleHByT2xkVmFsdWUpO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5zZXREaXJ0eUNoZWNrZXIgPSBmdW5jdGlvbiAoZGlydHlDaGVja2VyKSB7XG4gICAgdGhpcy5kaXJ0eUNoZWNrZXIgPSBkaXJ0eUNoZWNrZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhcnNlcjtcbiIsIi8qKlxuICogQGZpbGUg5pyA57uI55qE5qCRXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIEV4cHJDYWxjdWxhdGVyID0gcmVxdWlyZSgnLi9FeHByQ2FsY3VsYXRlcicpO1xuXG5mdW5jdGlvbiBUcmVlKG9wdGlvbnMpIHtcbiAgICB0aGlzLnN0YXJ0Tm9kZSA9IG9wdGlvbnMuc3RhcnROb2RlO1xuICAgIHRoaXMuZW5kTm9kZSA9IG9wdGlvbnMuZW5kTm9kZTtcbiAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xuICAgIHRoaXMuZXhwckNhbGN1bGF0ZXIgPSBuZXcgRXhwckNhbGN1bGF0ZXIoKTtcblxuICAgIHRoaXMudHJlZSA9IFtdO1xufVxuXG5UcmVlLnByb3RvdHlwZS50cmF2ZXJzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB3YWxrKHRoaXMsIHRoaXMuc3RhcnROb2RlLCB0aGlzLmVuZE5vZGUsIHRoaXMudHJlZSk7XG59O1xuXG5UcmVlLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBkYXRhID0gZGF0YSB8fCB7fTtcbiAgICB3YWxrUGFyc2Vycyh0aGlzLCB0aGlzLnRyZWUsIGRhdGEpO1xufTtcblxuVHJlZS5wcm90b3R5cGUuZ29EYXJrID0gZnVuY3Rpb24gKCkge1xuICAgIHV0aWxzLnRyYXZlcnNlTm9DaGFuZ2VOb2Rlcyh0aGlzLnN0YXJ0Tm9kZSwgdGhpcy5lbmROb2RlLCBmdW5jdGlvbiAoY3VyTm9kZSkge1xuICAgICAgICBpZiAoY3VyTm9kZS5ub2RlVHlwZSA9PT0gMSB8fCBjdXJOb2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgICAgICB1dGlscy5nb0RhcmsoY3VyTm9kZSk7XG4gICAgICAgIH1cbiAgICB9LCB0aGlzKTtcbn07XG5cblRyZWUucHJvdG90eXBlLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy50cmF2ZXJzZU5vQ2hhbmdlTm9kZXModGhpcy5zdGFydE5vZGUsIHRoaXMuZW5kTm9kZSwgZnVuY3Rpb24gKGN1ck5vZGUpIHtcbiAgICAgICAgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDEgfHwgY3VyTm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICAgICAgdXRpbHMucmVzdG9yZUZyb21EYXJrKGN1ck5vZGUpO1xuICAgICAgICB9XG4gICAgfSwgdGhpcyk7XG59O1xuXG5UcmVlLnByb3RvdHlwZS5zZXREaXJ0eUNoZWNrZXIgPSBmdW5jdGlvbiAoZGlydHlDaGVja2VyKSB7XG4gICAgdGhpcy5kaXJ0eUNoZWNrZXIgPSBkaXJ0eUNoZWNrZXI7XG59O1xuXG52YXIgUGFyc2VyQ2xhc3NlcyA9IFtdO1xud2luZG93LlBhcnNlckNsYXNzZXMgPSBQYXJzZXJDbGFzc2VzO1xuXG4vKipcbiAqIOazqOWGjOS4gOS4i+ino+aekOWZqOexu+OAglxuICpcbiAqIEBwYXJhbSAge0NvbnN0cnVjdG9yfSBQYXJzZXJDbGFzcyDop6PmnpDlmajnsbtcbiAqL1xuVHJlZS5yZWdpc3RlUGFyc2VyID0gZnVuY3Rpb24gKFBhcnNlckNsYXNzKSB7XG4gICAgdmFyIGlzRXhpdHNDaGlsZENsYXNzID0gZmFsc2U7XG4gICAgdXRpbHMuZWFjaChQYXJzZXJDbGFzc2VzLCBmdW5jdGlvbiAoUEMsIGluZGV4KSB7XG4gICAgICAgIGlmICh1dGlscy5pc1N1YkNsYXNzT2YoUEMsIFBhcnNlckNsYXNzKSkge1xuICAgICAgICAgICAgaXNFeGl0c0NoaWxkQ2xhc3MgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHV0aWxzLmlzU3ViQ2xhc3NPZihQYXJzZXJDbGFzcywgUEMpKSB7XG4gICAgICAgICAgICBQYXJzZXJDbGFzc2VzW2luZGV4XSA9IFBhcnNlckNsYXNzO1xuICAgICAgICAgICAgaXNFeGl0c0NoaWxkQ2xhc3MgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGlzRXhpdHNDaGlsZENsYXNzO1xuICAgIH0pO1xuXG4gICAgaWYgKCFpc0V4aXRzQ2hpbGRDbGFzcykge1xuICAgICAgICBQYXJzZXJDbGFzc2VzLnB1c2goUGFyc2VyQ2xhc3MpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVHJlZTtcblxuZnVuY3Rpb24gd2Fsa1BhcnNlcnModHJlZSwgcGFyc2VycywgZGF0YSkge1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IHBhcnNlcnMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICB2YXIgcGFyc2VyT2JqID0gcGFyc2Vyc1tpXTtcbiAgICAgICAgcGFyc2VyT2JqLnBhcnNlci5zZXREaXJ0eUNoZWNrZXIodHJlZS5kaXJ0eUNoZWNrZXIpO1xuICAgICAgICBwYXJzZXJPYmouZGF0YSA9IHV0aWxzLmV4dGVuZCh7fSwgcGFyc2VyT2JqLmRhdGEgfHwge30sIGRhdGEpO1xuXG4gICAgICAgIHBhcnNlck9iai5wYXJzZXIucmVzdG9yZUZyb21EYXJrKCk7XG4gICAgICAgIHZhciByZXN1bHQgPSBwYXJzZXJPYmoucGFyc2VyLnNldERhdGEocGFyc2VyT2JqLmRhdGEpO1xuICAgICAgICBpZiAodXRpbHMuaXNOdW1iZXIocmVzdWx0KSkge1xuICAgICAgICAgICAgdmFyIGJyYW5jaEluZGV4ID0gcmVzdWx0O1xuICAgICAgICAgICAgdmFyIGJyYW5jaGVzID0gcGFyc2VyT2JqLmNoaWxkcmVuO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDAsIGpsID0gYnJhbmNoZXMubGVuZ3RoOyBqIDwgamw7IGorKykge1xuICAgICAgICAgICAgICAgIGlmIChqID09PSBicmFuY2hJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICB3YWxrUGFyc2Vycyh0cmVlLCBicmFuY2hlc1tqXSwgcGFyc2VyT2JqLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciB6ID0gMCwgemwgPSBicmFuY2hlc1tqXS5sZW5ndGg7IHogPCB6bDsgeisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyYW5jaGVzW2pdW3pdLnBhcnNlci5nb0RhcmsoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocGFyc2VyT2JqLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICB3YWxrUGFyc2Vycyh0cmVlLCBwYXJzZXJPYmouY2hpbGRyZW4sIHBhcnNlck9iai5kYXRhKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gd2Fsayh0cmVlLCBzdGFydE5vZGUsIGVuZE5vZGUsIGNvbnRhaW5lcikge1xuICAgIHV0aWxzLnRyYXZlcnNlTm9DaGFuZ2VOb2RlcyhzdGFydE5vZGUsIGVuZE5vZGUsIGZ1bmN0aW9uIChjdXJOb2RlKSB7XG4gICAgICAgIGlmICghY3VyTm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHN0YXJ0Tm9kZTogY3VyTm9kZSxcbiAgICAgICAgICAgIG5vZGU6IGN1ck5vZGUsXG4gICAgICAgICAgICBjb25maWc6IHRyZWUuY29uZmlnLFxuICAgICAgICAgICAgZXhwckNhbGN1bGF0ZXI6IHRyZWUuZXhwckNhbGN1bGF0ZXJcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcGFyc2VyT2JqO1xuXG4gICAgICAgIHV0aWxzLmVhY2goUGFyc2VyQ2xhc3NlcywgZnVuY3Rpb24gKFBhcnNlckNsYXNzKSB7XG4gICAgICAgICAgICBwYXJzZXJPYmogPSBjcmVhdGVQYXJzZXIoUGFyc2VyQ2xhc3MsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKCFwYXJzZXJPYmogfHwgIXBhcnNlck9iai5wYXJzZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh1dGlscy5pc0FycmF5KHBhcnNlck9iai5jb2xsZWN0UmVzdWx0KSkge1xuICAgICAgICAgICAgICAgIHZhciBicmFuY2hlcyA9IHBhcnNlck9iai5jb2xsZWN0UmVzdWx0O1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5wdXNoKHtwYXJzZXI6IHBhcnNlck9iai5wYXJzZXIsIGNoaWxkcmVuOiBicmFuY2hlc30pO1xuICAgICAgICAgICAgICAgIHV0aWxzLmVhY2goYnJhbmNoZXMsIGZ1bmN0aW9uIChicmFuY2gsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFicmFuY2guc3RhcnROb2RlIHx8ICFicmFuY2guZW5kTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbiA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB3YWxrKHRyZWUsIGJyYW5jaC5zdGFydE5vZGUsIGJyYW5jaC5lbmROb2RlLCBjb24pO1xuICAgICAgICAgICAgICAgICAgICBicmFuY2hlc1tpXSA9IGNvbjtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICAgICAgICAgIGN1ck5vZGUgPSBwYXJzZXJPYmouZW5kTm9kZS5uZXh0U2libGluZztcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGNvbiA9IFtdO1xuICAgICAgICAgICAgY29udGFpbmVyLnB1c2goe3BhcnNlcjogcGFyc2VyT2JqLnBhcnNlciwgY2hpbGRyZW46IGNvbn0pO1xuICAgICAgICAgICAgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgICAgICAgICB3YWxrKHRyZWUsIGN1ck5vZGUuZmlyc3RDaGlsZCwgY3VyTm9kZS5sYXN0Q2hpbGQsIGNvbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nO1xuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgaWYgKCFwYXJzZXJPYmopIHtcbiAgICAgICAgICAgIGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nO1xuICAgICAgICB9XG4gICAgfSwgdGhpcyk7XG59XG5cbi8qKlxuICog5Yib5bu66Kej5p6Q5Zmo5a6e5L6L77yM5YW26L+U5Zue5YC855qE57uT5p6E5Li677yaXG4gKiB7XG4gKiAgICAgcGFyc2VyOiAuLi4sXG4gKiAgICAgY29sbGVjdFJlc3VsdDogLi4uXG4gKiB9XG4gKlxuICog6L+U5Zue5YC85a2Y5Zyo5aaC5LiL5Yeg56eN5oOF5Ya177yaXG4gKlxuICogMeOAgeWmguaenCBwYXJzZXIg5bGe5oCn5a2Y5Zyo5LiUIGNvbGxlY3RSZXN1bHQg5Li6IHRydWUg77yM5YiZ6K+05piO5b2T5YmN6Kej5p6Q5Zmo6Kej5p6Q5LqG5omA5pyJ55u45bqU55qE6IqC54K577yI5YyF5ous6LW35q2i6IqC54K56Ze055qE6IqC54K544CB5b2T5YmN6IqC54K55ZKM5a2Q5a2Z6IqC54K577yJ77ybXG4gKiAy44CB55u05o6l6L+U5Zue5YGH5YC85oiW6ICFIHBhcnNlciDkuI3lrZjlnKjvvIzor7TmmI7msqHmnInlpITnkIbku7vkvZXoioLngrnvvIzlvZPliY3oioLngrnkuI3lsZ7kuo7lvZPliY3op6PmnpDlmajlpITnkIbvvJtcbiAqIDPjgIFwYXJzZXIg5a2Y5Zyo5LiUIGNvbGxlY3RSZXN1bHQg5Li65pWw57uE77yM57uT5p6E5aaC5LiL77yaXG4gKiAgICAgW1xuICogICAgICAgICB7XG4gKiAgICAgICAgICAgICBzdGFydE5vZGU6IE5vZGUuPC4uLj4sXG4gKiAgICAgICAgICAgICBlbmROb2RlOiBOb2RlLjwuLi4+XG4gKiAgICAgICAgIH1cbiAqICAgICBdXG4gKlxuICogIOWImeivtOaYjuW9k+WJjeaYr+W4puacieW+iOWkmuWIhuaUr+eahOiKgueCue+8jOimgeS+neasoeino+aekOaVsOe7hOS4reavj+S4quWFg+e0oOaMh+WumueahOiKgueCueiMg+WbtOOAglxuICogIOiAjOS4lO+8jOivpeino+aekOWZqOWvueW6lOeahCBzZXREYXRhKCkg5pa55rOV5bCG5Lya6L+U5Zue5pW05pWw77yM5oyH5piO5L2/55So5ZOq5LiA5Liq5YiG5pSv55qE6IqC54K544CCXG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0ge0NvbnN0cnVjdG9yfSBQYXJzZXJDbGFzcyBwYXJzZXIg57G7XG4gKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnMg5Yid5aeL5YyW5Y+C5pWwXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAg6L+U5Zue5YC8XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVBhcnNlcihQYXJzZXJDbGFzcywgb3B0aW9ucykge1xuICAgIGlmICghUGFyc2VyQ2xhc3MuaXNQcm9wZXJOb2RlKG9wdGlvbnMuc3RhcnROb2RlIHx8IG9wdGlvbnMubm9kZSwgb3B0aW9ucy5jb25maWcpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZW5kTm9kZTtcbiAgICBpZiAoUGFyc2VyQ2xhc3MuZmluZEVuZE5vZGUpIHtcbiAgICAgICAgZW5kTm9kZSA9IFBhcnNlckNsYXNzLmZpbmRFbmROb2RlKG9wdGlvbnMuc3RhcnROb2RlIHx8IG9wdGlvbnMubm9kZSwgb3B0aW9ucy5jb25maWcpO1xuXG4gICAgICAgIGlmICghZW5kTm9kZSkge1xuICAgICAgICAgICAgdGhyb3cgUGFyc2VyQ2xhc3MuZ2V0Tm9FbmROb2RlRXJyb3IoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBwYXJzZXIgPSBuZXcgUGFyc2VyQ2xhc3ModXRpbHMuZXh0ZW5kKG9wdGlvbnMsIHtcbiAgICAgICAgZW5kTm9kZTogZW5kTm9kZVxuICAgIH0pKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHBhcnNlcjogcGFyc2VyLFxuICAgICAgICBjb2xsZWN0UmVzdWx0OiBwYXJzZXIuY29sbGVjdEV4cHJzKCksXG4gICAgICAgIGVuZE5vZGU6IGVuZE5vZGUgfHwgb3B0aW9ucy5ub2RlXG4gICAgfTtcbn1cblxuXG5cbiIsIi8qKlxuICogQGZpbGUg57un5om/XG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxuZnVuY3Rpb24gaW5oZXJpdChDaGlsZENsYXNzLCBQYXJlbnRDbGFzcykge1xuICAgIHZhciBjaGlsZFByb3RvID0gQ2hpbGRDbGFzcy5wcm90b3R5cGU7XG4gICAgQ2hpbGRDbGFzcy5wcm90b3R5cGUgPSBuZXcgUGFyZW50Q2xhc3Moe30pO1xuXG4gICAgdmFyIGtleTtcbiAgICBmb3IgKGtleSBpbiBjaGlsZFByb3RvKSB7XG4gICAgICAgIGlmIChjaGlsZFByb3RvLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIENoaWxkQ2xhc3MucHJvdG90eXBlW2tleV0gPSBjaGlsZFByb3RvW2tleV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDnu6fmib/pnZnmgIHlsZ7mgKdcbiAgICBmb3IgKGtleSBpbiBQYXJlbnRDbGFzcykge1xuICAgICAgICBpZiAoUGFyZW50Q2xhc3MuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaWYgKENoaWxkQ2xhc3Nba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgQ2hpbGRDbGFzc1trZXldID0gUGFyZW50Q2xhc3Nba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBDaGlsZENsYXNzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluaGVyaXQ7XG5cbi8vIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7XG4vLyAgICAgdmFyIEVtcHR5ID0gZnVuY3Rpb24gKCkge307XG4vLyAgICAgRW1wdHkucHJvdG90eXBlID0gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG4vLyAgICAgdmFyIHNlbGZQcm90b3R5cGUgPSBzdWJDbGFzcy5wcm90b3R5cGU7XG4vLyAgICAgdmFyIHByb3RvID0gc3ViQ2xhc3MucHJvdG90eXBlID0gbmV3IEVtcHR5KCk7XG5cbi8vICAgICBmb3IgKHZhciBrZXkgaW4gc2VsZlByb3RvdHlwZSkge1xuLy8gICAgICAgICBwcm90b1trZXldID0gc2VsZlByb3RvdHlwZVtrZXldO1xuLy8gICAgIH1cbi8vICAgICBzdWJDbGFzcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBzdWJDbGFzcztcbi8vICAgICBzdWJDbGFzcy5zdXBlckNsYXNzID0gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG5cbi8vICAgICByZXR1cm4gc3ViQ2xhc3M7XG4vLyB9O1xuIiwiLyoqXG4gKiBAZmlsZSDkuIDloIbpobnnm67ph4zpnaLluLjnlKjnmoTmlrnms5VcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG5leHBvcnRzLnNsaWNlID0gZnVuY3Rpb24gKGFyciwgc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnIsIHN0YXJ0LCBlbmQpO1xufTtcblxuZXhwb3J0cy5nb0RhcmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBub2RlLl9fdGV4dF9fID0gbm9kZS5ub2RlVmFsdWU7XG4gICAgICAgIG5vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgfVxufTtcblxuZXhwb3J0cy5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgaWYgKG5vZGUuX190ZXh0X18gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbm9kZS5ub2RlVmFsdWUgPSBub2RlLl9fdGV4dF9fO1xuICAgICAgICAgICAgbm9kZS5fX3RleHRfXyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmV4cG9ydHMuY3JlYXRlRXhwckZuID0gZnVuY3Rpb24gKGV4cHJSZWdFeHAsIGV4cHIsIGV4cHJDYWxjdWxhdGVyKSB7XG4gICAgZXhwciA9IGV4cHIucmVwbGFjZShleHByUmVnRXhwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBhcmd1bWVudHNbMV07XG4gICAgfSk7XG4gICAgZXhwckNhbGN1bGF0ZXIuY3JlYXRlRXhwckZuKGV4cHIpO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJldHVybiBleHByQ2FsY3VsYXRlci5jYWxjdWxhdGUoZXhwciwgZmFsc2UsIGRhdGEpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIOi2hee6p+eugOWNleeahCBleHRlbmQg77yM5Zug5Li65pys5bqT5a+5IGV4dGVuZCDmsqHpgqPpq5jnmoTopoHmsYLvvIxcbiAqIOetieWIsOacieimgeaxgueahOaXtuWAmeWGjeWujOWWhOOAglxuICpcbiAqIEBpbm5lclxuICogQHBhcmFtICB7T2JqZWN0fSB0YXJnZXQg55uu5qCH5a+56LGhXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICDmnIDnu4jlkIjlubblkI7nmoTlr7nosaFcbiAqL1xuZXhwb3J0cy5leHRlbmQgPSBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gICAgdmFyIHNyY3MgPSBleHBvcnRzLnNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gc3Jjcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIC8qIGVzbGludC1kaXNhYmxlIGd1YXJkLWZvci1pbiAqL1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3Jjc1tpXSkge1xuICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzcmNzW2ldW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgLyogZXNsaW50LWVuYWJsZSBndWFyZC1mb3ItaW4gKi9cbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn07XG5cbmV4cG9ydHMudHJhdmVyc2VOb0NoYW5nZU5vZGVzID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgbm9kZUZuLCBjb250ZXh0KSB7XG4gICAgZm9yICh2YXIgY3VyTm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICAgICAgY3VyTm9kZSAmJiBjdXJOb2RlICE9PSBlbmROb2RlO1xuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZ1xuICAgICkge1xuICAgICAgICBpZiAobm9kZUZuLmNhbGwoY29udGV4dCwgY3VyTm9kZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5vZGVGbi5jYWxsKGNvbnRleHQsIGVuZE5vZGUpO1xufTtcblxuZXhwb3J0cy50cmF2ZXJzZU5vZGVzID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgbm9kZUZuLCBjb250ZXh0KSB7XG4gICAgdmFyIG5vZGVzID0gW107XG4gICAgZm9yICh2YXIgY3VyTm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICAgICAgY3VyTm9kZSAmJiBjdXJOb2RlICE9PSBlbmROb2RlO1xuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZ1xuICAgICkge1xuICAgICAgICBub2Rlcy5wdXNoKGN1ck5vZGUpO1xuICAgIH1cblxuICAgIG5vZGVzLnB1c2goZW5kTm9kZSk7XG5cbiAgICBleHBvcnRzLmVhY2gobm9kZXMsIG5vZGVGbiwgY29udGV4dCk7XG59O1xuXG5leHBvcnRzLmVhY2ggPSBmdW5jdGlvbiAoYXJyLCBmbiwgY29udGV4dCkge1xuICAgIGlmIChleHBvcnRzLmlzQXJyYXkoYXJyKSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBhcnIubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgaWYgKGZuLmNhbGwoY29udGV4dCwgYXJyW2ldLCBpLCBhcnIpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGFyciA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBhcnIpIHtcbiAgICAgICAgICAgIGlmIChmbi5jYWxsKGNvbnRleHQsIGFycltrXSwgaywgYXJyKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0cy5pc0FycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG5cbmV4cG9ydHMuaXNOdW1iZXIgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBOdW1iZXJdJztcbn07XG5cbmV4cG9ydHMuaXNTdWJDbGFzc09mID0gZnVuY3Rpb24gKFN1YkNsYXNzLCBTdXBlckNsYXNzKSB7XG4gICAgcmV0dXJuIFN1YkNsYXNzLnByb3RvdHlwZSBpbnN0YW5jZW9mIFN1cGVyQ2xhc3M7XG59O1xuIiwid2luZG93LkZvckRpcmVjdGl2ZVBhcnNlciA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi4vc3JjL0ZvckRpcmVjdGl2ZVBhcnNlci5qcycpOyJdfQ==
