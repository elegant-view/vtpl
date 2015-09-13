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
 * @file 表达式解析器，一个文本节点或者元素节点对应一个表达式解析器实例
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');
var inherit = require('./inherit');
var utils = require('./utils');
var Tree = require('./Tree');

function ExprParser(options) {
    Parser.call(this, options);
}

ExprParser.prototype.initialize = function (options) {
    Parser.prototype.initialize.apply(this, arguments);

    this.node = options.node;
    this.config = options.config;

    this.exprs = [];
    this.exprFns = {};
    this.updateFns = {};
    this.exprOldValues = {};
};

/**
 * 搜集过程
 *
 * @public
 */
ExprParser.prototype.collectExprs = function () {
    var curNode = this.node;

    // 文本节点
    if (curNode.nodeType === 3) {
        this.addExpr();
        return true;
    }

    // 元素节点
    if (curNode.nodeType === 1) {
        var attributes = curNode.attributes;
        for (var i = 0, il = attributes.length; i < il; i++) {
            this.addExpr(attributes[i]);
        }
        return true;
    }

    return false;
};

/**
 * 添加表达式
 *
 * @protected
 * @param {Attr} attr 如果当前是元素节点，则要传入遍历到的属性
 */
ExprParser.prototype.addExpr = function (attr) {
    var expr = attr ? attr.value : this.node.nodeValue;
    if (!this.config.getExprRegExp().test(expr)) {
        return;
    }
    addExpr(
        this,
        expr,
        attr ? createAttrUpdateFn(attr) : (function (curNode) {
            return function (exprValue) {
                curNode.nodeValue = exprValue;
            };
        })(this.node)
    );
};

/**
 * 设置数据过程
 *
 * @public
 * @param {Object} data 数据
 */
ExprParser.prototype.setData = function (data) {
    var exprs = this.exprs;
    var exprOldValues = this.exprOldValues;
    for (var i = 0, il = exprs.length; i < il; i++) {
        var expr = exprs[i];
        var exprValue = this.exprFns[expr](data);

        if (this.dirtyCheck(expr, exprValue, exprOldValues[expr])) {
            var updateFns = this.updateFns[expr];
            for (var j = 0, jl = updateFns.length; j < jl; j++) {
                updateFns[j](exprValue);
            }
        }

        exprOldValues[expr] = exprValue;
    }
};

/**
 * 节点“隐藏”起来
 *
 * @public
 */
ExprParser.prototype.goDark = function () {
    utils.goDark(this.node);
};

/**
 * 节点“显示”出来
 *
 * @public
 */
ExprParser.prototype.restoreFromDark = function () {
    utils.restoreFromDark(this.node);
};

ExprParser.isProperNode = function (node) {
    return node.nodeType === 1 || node.nodeType === 3;
};

module.exports = inherit(ExprParser, Parser)
Tree.registeParser(module.exports);

function createAttrUpdateFn(attr) {
    return function (exprValue) {
        attr.value = exprValue;
    };
}

function addExpr(parser, expr, updateFn) {
    parser.exprs.push(expr);
    if (!parser.exprFns[expr]) {
        parser.exprFns[expr] = createExprFn(parser, expr);
    }
    parser.updateFns[expr] = parser.updateFns[expr] || [];
    parser.updateFns[expr].push(updateFn);
}

function createExprFn(parser, expr) {
    return function (data) {
        return expr.replace(parser.config.getExprRegExp(), function () {
            parser.exprCalculater.createExprFn(arguments[1]);
            return parser.exprCalculater.calculate(arguments[1], false, data);
        });
    };
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
window.ExprParser = module.exports = require('../src/ExprParser.js');
},{"../src/ExprParser.js":2}]},{},[7])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9FeHByQ2FsY3VsYXRlci5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9FeHByUGFyc2VyLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL1BhcnNlci5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9UcmVlLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL2luaGVyaXQuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvdXRpbHMuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC90bXAvZmFrZV85ZDI2MWU4NC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIEV4cHJDYWxjdWxhdGVyKCkge1xuICAgIHRoaXMuZm5zID0ge307XG5cbiAgICB0aGlzLmV4cHJOYW1lTWFwID0ge307XG4gICAgdGhpcy5leHByTmFtZVJlZ0V4cCA9IC9cXC4/XFwkPyhbYS16fEEtWl0rfChbYS16fEEtWl0rWzAtOV0rW2EtenxBLVpdKikpL2c7XG59XG5cbkV4cHJDYWxjdWxhdGVyLnByb3RvdHlwZS5jcmVhdGVFeHByRm4gPSBmdW5jdGlvbiAoZXhwciwgYXZvaWRSZXR1cm4pIHtcbiAgICBhdm9pZFJldHVybiA9ICEhYXZvaWRSZXR1cm47XG4gICAgdGhpcy5mbnNbZXhwcl0gPSB0aGlzLmZuc1tleHByXSB8fCB7fTtcbiAgICBpZiAodGhpcy5mbnNbZXhwcl1bYXZvaWRSZXR1cm5dKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcGFyYW1zID0gZ2V0VmFyaWFibGVOYW1lc0Zyb21FeHByKHRoaXMsIGV4cHIpO1xuICAgIHZhciBmbiA9IG5ldyBGdW5jdGlvbihwYXJhbXMsIChhdm9pZFJldHVybiA/ICcnIDogJ3JldHVybiAnKSArIGV4cHIpO1xuXG4gICAgdGhpcy5mbnNbZXhwcl1bYXZvaWRSZXR1cm5dID0ge1xuICAgICAgICBwYXJhbU5hbWVzOiBwYXJhbXMsXG4gICAgICAgIGZuOiBmblxuICAgIH07XG59O1xuXG5FeHByQ2FsY3VsYXRlci5wcm90b3R5cGUuY2FsY3VsYXRlID0gZnVuY3Rpb24gKGV4cHIsIGF2b2lkUmV0dXJuLCBkYXRhKSB7XG4gICAgdmFyIGZuT2JqID0gdGhpcy5mbnNbZXhwcl1bYXZvaWRSZXR1cm5dO1xuICAgIGlmICghZm5PYmopIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyBzdWNoIGV4cHJlc3Npb24gZnVuY3Rpb24gY3JlYXRlZCEnKTtcbiAgICB9XG5cbiAgICB2YXIgZm5BcmdzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gZm5PYmoucGFyYW1OYW1lcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIHZhciBwYXJhbSA9IGZuT2JqLnBhcmFtTmFtZXNbaV07XG4gICAgICAgIHZhciB2YWx1ZSA9IGRhdGFbcGFyYW1dO1xuICAgICAgICBmbkFyZ3MucHVzaCh2YWx1ZSA9PT0gdW5kZWZpbmVkID8gJycgOiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdDtcbiAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSBmbk9iai5mbi5hcHBseShudWxsLCBmbkFyZ3MpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICByZXN1bHQgPSAnJztcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXhwckNhbGN1bGF0ZXI7XG5cbi8qKlxuICog5LuO6KGo6L6+5byP5Lit5oq956a75Ye65Y+Y6YeP5ZCNXG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0ge0V4cHJDYWxjdWxhdGVyfSBtZSDlr7nlupTlrp7kvotcbiAqIEBwYXJhbSAge3N0cmluZ30gZXhwciDooajovr7lvI/lrZfnrKbkuLLvvIznsbvkvLzkuo4gYCR7bmFtZX1gIOS4reeahCBuYW1lXG4gKiBAcmV0dXJuIHtBcnJheS48c3RyaW5nPn0gICAgICDlj5jph4/lkI3mlbDnu4RcbiAqL1xuZnVuY3Rpb24gZ2V0VmFyaWFibGVOYW1lc0Zyb21FeHByKG1lLCBleHByKSB7XG4gICAgaWYgKG1lLmV4cHJOYW1lTWFwW2V4cHJdKSB7XG4gICAgICAgIHJldHVybiBtZS5leHByTmFtZU1hcFtleHByXTtcbiAgICB9XG5cbiAgICB2YXIgbWF0Y2hlcyA9IGV4cHIubWF0Y2gobWUuZXhwck5hbWVSZWdFeHApIHx8IFtdO1xuICAgIHZhciBuYW1lcyA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IG1hdGNoZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICBpZiAobWF0Y2hlc1tpXSAmJiBtYXRjaGVzW2ldWzBdICE9PSAnLicpIHtcbiAgICAgICAgICAgIG5hbWVzW21hdGNoZXNbaV1dID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciByZXQgPSBbXTtcbiAgICB1dGlscy5lYWNoKG5hbWVzLCBmdW5jdGlvbiAoaXNPaywgbmFtZSkge1xuICAgICAgICBpZiAoaXNPaykge1xuICAgICAgICAgICAgcmV0LnB1c2gobmFtZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBtZS5leHByTmFtZU1hcFtleHByXSA9IHJldDtcblxuICAgIHJldHVybiByZXQ7XG59XG4iLCIvKipcbiAqIEBmaWxlIOihqOi+vuW8j+ino+aekOWZqO+8jOS4gOS4quaWh+acrOiKgueCueaIluiAheWFg+e0oOiKgueCueWvueW6lOS4gOS4quihqOi+vuW8j+ino+aekOWZqOWunuS+i1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbnZhciBQYXJzZXIgPSByZXF1aXJlKCcuL1BhcnNlcicpO1xudmFyIGluaGVyaXQgPSByZXF1aXJlKCcuL2luaGVyaXQnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBUcmVlID0gcmVxdWlyZSgnLi9UcmVlJyk7XG5cbmZ1bmN0aW9uIEV4cHJQYXJzZXIob3B0aW9ucykge1xuICAgIFBhcnNlci5jYWxsKHRoaXMsIG9wdGlvbnMpO1xufVxuXG5FeHByUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBQYXJzZXIucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHRoaXMubm9kZSA9IG9wdGlvbnMubm9kZTtcbiAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xuXG4gICAgdGhpcy5leHBycyA9IFtdO1xuICAgIHRoaXMuZXhwckZucyA9IHt9O1xuICAgIHRoaXMudXBkYXRlRm5zID0ge307XG4gICAgdGhpcy5leHByT2xkVmFsdWVzID0ge307XG59O1xuXG4vKipcbiAqIOaQnOmbhui/h+eoi1xuICpcbiAqIEBwdWJsaWNcbiAqL1xuRXhwclBhcnNlci5wcm90b3R5cGUuY29sbGVjdEV4cHJzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJOb2RlID0gdGhpcy5ub2RlO1xuXG4gICAgLy8g5paH5pys6IqC54K5XG4gICAgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgdGhpcy5hZGRFeHByKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIOWFg+e0oOiKgueCuVxuICAgIGlmIChjdXJOb2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIHZhciBhdHRyaWJ1dGVzID0gY3VyTm9kZS5hdHRyaWJ1dGVzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBhdHRyaWJ1dGVzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuYWRkRXhwcihhdHRyaWJ1dGVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIOa3u+WKoOihqOi+vuW8j1xuICpcbiAqIEBwcm90ZWN0ZWRcbiAqIEBwYXJhbSB7QXR0cn0gYXR0ciDlpoLmnpzlvZPliY3mmK/lhYPntKDoioLngrnvvIzliJnopoHkvKDlhaXpgY3ljobliLDnmoTlsZ7mgKdcbiAqL1xuRXhwclBhcnNlci5wcm90b3R5cGUuYWRkRXhwciA9IGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgdmFyIGV4cHIgPSBhdHRyID8gYXR0ci52YWx1ZSA6IHRoaXMubm9kZS5ub2RlVmFsdWU7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5nZXRFeHByUmVnRXhwKCkudGVzdChleHByKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGFkZEV4cHIoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIGV4cHIsXG4gICAgICAgIGF0dHIgPyBjcmVhdGVBdHRyVXBkYXRlRm4oYXR0cikgOiAoZnVuY3Rpb24gKGN1ck5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXhwclZhbHVlKSB7XG4gICAgICAgICAgICAgICAgY3VyTm9kZS5ub2RlVmFsdWUgPSBleHByVmFsdWU7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KSh0aGlzLm5vZGUpXG4gICAgKTtcbn07XG5cbi8qKlxuICog6K6+572u5pWw5o2u6L+H56iLXG4gKlxuICogQHB1YmxpY1xuICogQHBhcmFtIHtPYmplY3R9IGRhdGEg5pWw5o2uXG4gKi9cbkV4cHJQYXJzZXIucHJvdG90eXBlLnNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBleHBycyA9IHRoaXMuZXhwcnM7XG4gICAgdmFyIGV4cHJPbGRWYWx1ZXMgPSB0aGlzLmV4cHJPbGRWYWx1ZXM7XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gZXhwcnMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICB2YXIgZXhwciA9IGV4cHJzW2ldO1xuICAgICAgICB2YXIgZXhwclZhbHVlID0gdGhpcy5leHByRm5zW2V4cHJdKGRhdGEpO1xuXG4gICAgICAgIGlmICh0aGlzLmRpcnR5Q2hlY2soZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWVzW2V4cHJdKSkge1xuICAgICAgICAgICAgdmFyIHVwZGF0ZUZucyA9IHRoaXMudXBkYXRlRm5zW2V4cHJdO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDAsIGpsID0gdXBkYXRlRm5zLmxlbmd0aDsgaiA8IGpsOyBqKyspIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVGbnNbal0oZXhwclZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cHJPbGRWYWx1ZXNbZXhwcl0gPSBleHByVmFsdWU7XG4gICAgfVxufTtcblxuLyoqXG4gKiDoioLngrnigJzpmpDol4/igJ3otbfmnaVcbiAqXG4gKiBAcHVibGljXG4gKi9cbkV4cHJQYXJzZXIucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy5nb0RhcmsodGhpcy5ub2RlKTtcbn07XG5cbi8qKlxuICog6IqC54K54oCc5pi+56S64oCd5Ye65p2lXG4gKlxuICogQHB1YmxpY1xuICovXG5FeHByUGFyc2VyLnByb3RvdHlwZS5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgdXRpbHMucmVzdG9yZUZyb21EYXJrKHRoaXMubm9kZSk7XG59O1xuXG5FeHByUGFyc2VyLmlzUHJvcGVyTm9kZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUubm9kZVR5cGUgPT09IDEgfHwgbm9kZS5ub2RlVHlwZSA9PT0gMztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gaW5oZXJpdChFeHByUGFyc2VyLCBQYXJzZXIpXG5UcmVlLnJlZ2lzdGVQYXJzZXIobW9kdWxlLmV4cG9ydHMpO1xuXG5mdW5jdGlvbiBjcmVhdGVBdHRyVXBkYXRlRm4oYXR0cikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZXhwclZhbHVlKSB7XG4gICAgICAgIGF0dHIudmFsdWUgPSBleHByVmFsdWU7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gYWRkRXhwcihwYXJzZXIsIGV4cHIsIHVwZGF0ZUZuKSB7XG4gICAgcGFyc2VyLmV4cHJzLnB1c2goZXhwcik7XG4gICAgaWYgKCFwYXJzZXIuZXhwckZuc1tleHByXSkge1xuICAgICAgICBwYXJzZXIuZXhwckZuc1tleHByXSA9IGNyZWF0ZUV4cHJGbihwYXJzZXIsIGV4cHIpO1xuICAgIH1cbiAgICBwYXJzZXIudXBkYXRlRm5zW2V4cHJdID0gcGFyc2VyLnVwZGF0ZUZuc1tleHByXSB8fCBbXTtcbiAgICBwYXJzZXIudXBkYXRlRm5zW2V4cHJdLnB1c2godXBkYXRlRm4pO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFeHByRm4ocGFyc2VyLCBleHByKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJldHVybiBleHByLnJlcGxhY2UocGFyc2VyLmNvbmZpZy5nZXRFeHByUmVnRXhwKCksIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHBhcnNlci5leHByQ2FsY3VsYXRlci5jcmVhdGVFeHByRm4oYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZXIuZXhwckNhbGN1bGF0ZXIuY2FsY3VsYXRlKGFyZ3VtZW50c1sxXSwgZmFsc2UsIGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9O1xufVxuIiwiLyoqXG4gKiBAZmlsZSDop6PmnpDlmajnmoTmir3osaHln7rnsbtcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG4vKipcbiAqIOaehOmAoOWHveaVsFxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMg6YWN572u5Y+C5pWw77yM5LiA6Iis5Y+v6IO95Lya5pyJ5aaC5LiL5YaF5a6577yaXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnROb2RlOiAuLi4sXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kTm9kZTogLi4uLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGU6IC4uLixcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25maWc6IC4uLlxuICogICAgICAgICAgICAgICAgICAgICAgICAgfVxuICogICAgICAgICAgICAgICAgICAgICAgICAg5YW35L2T5piv5ZWl5Y+v5Lul5Y+C5Yqg5YW35L2T55qE5a2Q57G7XG4gKi9cbmZ1bmN0aW9uIFBhcnNlcihvcHRpb25zKSB7XG4gICAgdGhpcy5pbml0aWFsaXplKG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIOWIneWni+WMllxuICpcbiAqIEBwcm90ZWN0ZWTDn1xuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMg5p2l6Ieq5LqO5p6E6YCg5Ye95pWwXG4gKi9cblBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdGhpcy5leHByQ2FsY3VsYXRlciA9IG9wdGlvbnMuZXhwckNhbGN1bGF0ZXI7XG4gICAgdGhpcy5jb25maWcgPSBvcHRpb25zLmNvbmZpZztcbn07XG5cbi8qKlxuICog6ZSA5q+B6Kej5p6Q5ZmoXG4gKlxuICogQHB1YmxpY1xuICogQGFic3RyYWN0XG4gKi9cblBhcnNlci5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vKipcbiAqIOiuvue9ruaVsOaNrlxuICpcbiAqIEBwdWJsaWNcbiAqIEBhYnN0cmFjdFxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEg6KaB6K6+572u55qE5pWw5o2uXG4gKi9cblBhcnNlci5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7fTtcblxuLyoqXG4gKiDpmpDol4/nm7jlhbPlhYPntKBcbiAqXG4gKiBAcHVibGljXG4gKi9cblBhcnNlci5wcm90b3R5cGUuZ29EYXJrID0gZnVuY3Rpb24gKCkge307XG5cbi8qKlxuICog5pi+56S655u45YWz5YWD57SgXG4gKlxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vKipcbiAqIOaQnOmbhuihqOi+vuW8j++8jOeUn+aIkOihqOi+vuW8j+WHveaVsOWSjCBET00g5pu05paw5Ye95pWwXG4gKlxuICogQGFic3RyYWN0XG4gKiBAcHVibGljXG4gKi9cblBhcnNlci5wcm90b3R5cGUuY29sbGVjdEV4cHJzID0gZnVuY3Rpb24gKCkge307XG5cblBhcnNlci5wcm90b3R5cGUuZGlydHlDaGVjayA9IGZ1bmN0aW9uIChleHByLCBleHByVmFsdWUsIGV4cHJPbGRWYWx1ZSkge1xuICAgIHZhciBkaXJ0eUNoZWNrZXJGbiA9IHRoaXMuZGlydHlDaGVja2VyID8gdGhpcy5kaXJ0eUNoZWNrZXIuZ2V0Q2hlY2tlcihleHByKSA6IG51bGw7XG4gICAgcmV0dXJuIChkaXJ0eUNoZWNrZXJGbiAmJiBkaXJ0eUNoZWNrZXJGbihleHByLCBleHByVmFsdWUsIGV4cHJPbGRWYWx1ZSkpXG4gICAgICAgICAgICB8fCAoIWRpcnR5Q2hlY2tlckZuICYmIGV4cHJWYWx1ZSAhPT0gZXhwck9sZFZhbHVlKTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUuc2V0RGlydHlDaGVja2VyID0gZnVuY3Rpb24gKGRpcnR5Q2hlY2tlcikge1xuICAgIHRoaXMuZGlydHlDaGVja2VyID0gZGlydHlDaGVja2VyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYXJzZXI7XG4iLCIvKipcbiAqIEBmaWxlIOacgOe7iOeahOagkVxuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBFeHByQ2FsY3VsYXRlciA9IHJlcXVpcmUoJy4vRXhwckNhbGN1bGF0ZXInKTtcblxuZnVuY3Rpb24gVHJlZShvcHRpb25zKSB7XG4gICAgdGhpcy5zdGFydE5vZGUgPSBvcHRpb25zLnN0YXJ0Tm9kZTtcbiAgICB0aGlzLmVuZE5vZGUgPSBvcHRpb25zLmVuZE5vZGU7XG4gICAgdGhpcy5jb25maWcgPSBvcHRpb25zLmNvbmZpZztcbiAgICB0aGlzLmV4cHJDYWxjdWxhdGVyID0gbmV3IEV4cHJDYWxjdWxhdGVyKCk7XG5cbiAgICB0aGlzLnRyZWUgPSBbXTtcbn1cblxuVHJlZS5wcm90b3R5cGUudHJhdmVyc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgd2Fsayh0aGlzLCB0aGlzLnN0YXJ0Tm9kZSwgdGhpcy5lbmROb2RlLCB0aGlzLnRyZWUpO1xufTtcblxuVHJlZS5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgZGF0YSA9IGRhdGEgfHwge307XG4gICAgd2Fsa1BhcnNlcnModGhpcywgdGhpcy50cmVlLCBkYXRhKTtcbn07XG5cblRyZWUucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy50cmF2ZXJzZU5vQ2hhbmdlTm9kZXModGhpcy5zdGFydE5vZGUsIHRoaXMuZW5kTm9kZSwgZnVuY3Rpb24gKGN1ck5vZGUpIHtcbiAgICAgICAgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDEgfHwgY3VyTm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICAgICAgdXRpbHMuZ29EYXJrKGN1ck5vZGUpO1xuICAgICAgICB9XG4gICAgfSwgdGhpcyk7XG59O1xuXG5UcmVlLnByb3RvdHlwZS5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgdXRpbHMudHJhdmVyc2VOb0NoYW5nZU5vZGVzKHRoaXMuc3RhcnROb2RlLCB0aGlzLmVuZE5vZGUsIGZ1bmN0aW9uIChjdXJOb2RlKSB7XG4gICAgICAgIGlmIChjdXJOb2RlLm5vZGVUeXBlID09PSAxIHx8IGN1ck5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgICAgIHV0aWxzLnJlc3RvcmVGcm9tRGFyayhjdXJOb2RlKTtcbiAgICAgICAgfVxuICAgIH0sIHRoaXMpO1xufTtcblxuVHJlZS5wcm90b3R5cGUuc2V0RGlydHlDaGVja2VyID0gZnVuY3Rpb24gKGRpcnR5Q2hlY2tlcikge1xuICAgIHRoaXMuZGlydHlDaGVja2VyID0gZGlydHlDaGVja2VyO1xufTtcblxudmFyIFBhcnNlckNsYXNzZXMgPSBbXTtcbndpbmRvdy5QYXJzZXJDbGFzc2VzID0gUGFyc2VyQ2xhc3NlcztcblxuLyoqXG4gKiDms6jlhozkuIDkuIvop6PmnpDlmajnsbvjgIJcbiAqXG4gKiBAcGFyYW0gIHtDb25zdHJ1Y3Rvcn0gUGFyc2VyQ2xhc3Mg6Kej5p6Q5Zmo57G7XG4gKi9cblRyZWUucmVnaXN0ZVBhcnNlciA9IGZ1bmN0aW9uIChQYXJzZXJDbGFzcykge1xuICAgIHZhciBpc0V4aXRzQ2hpbGRDbGFzcyA9IGZhbHNlO1xuICAgIHV0aWxzLmVhY2goUGFyc2VyQ2xhc3NlcywgZnVuY3Rpb24gKFBDLCBpbmRleCkge1xuICAgICAgICBpZiAodXRpbHMuaXNTdWJDbGFzc09mKFBDLCBQYXJzZXJDbGFzcykpIHtcbiAgICAgICAgICAgIGlzRXhpdHNDaGlsZENsYXNzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh1dGlscy5pc1N1YkNsYXNzT2YoUGFyc2VyQ2xhc3MsIFBDKSkge1xuICAgICAgICAgICAgUGFyc2VyQ2xhc3Nlc1tpbmRleF0gPSBQYXJzZXJDbGFzcztcbiAgICAgICAgICAgIGlzRXhpdHNDaGlsZENsYXNzID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpc0V4aXRzQ2hpbGRDbGFzcztcbiAgICB9KTtcblxuICAgIGlmICghaXNFeGl0c0NoaWxkQ2xhc3MpIHtcbiAgICAgICAgUGFyc2VyQ2xhc3Nlcy5wdXNoKFBhcnNlckNsYXNzKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyZWU7XG5cbmZ1bmN0aW9uIHdhbGtQYXJzZXJzKHRyZWUsIHBhcnNlcnMsIGRhdGEpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBwYXJzZXJzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcnNlck9iaiA9IHBhcnNlcnNbaV07XG4gICAgICAgIHBhcnNlck9iai5wYXJzZXIuc2V0RGlydHlDaGVja2VyKHRyZWUuZGlydHlDaGVja2VyKTtcbiAgICAgICAgcGFyc2VyT2JqLmRhdGEgPSB1dGlscy5leHRlbmQoe30sIHBhcnNlck9iai5kYXRhIHx8IHt9LCBkYXRhKTtcblxuICAgICAgICBwYXJzZXJPYmoucGFyc2VyLnJlc3RvcmVGcm9tRGFyaygpO1xuICAgICAgICB2YXIgcmVzdWx0ID0gcGFyc2VyT2JqLnBhcnNlci5zZXREYXRhKHBhcnNlck9iai5kYXRhKTtcbiAgICAgICAgaWYgKHV0aWxzLmlzTnVtYmVyKHJlc3VsdCkpIHtcbiAgICAgICAgICAgIHZhciBicmFuY2hJbmRleCA9IHJlc3VsdDtcbiAgICAgICAgICAgIHZhciBicmFuY2hlcyA9IHBhcnNlck9iai5jaGlsZHJlbjtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwLCBqbCA9IGJyYW5jaGVzLmxlbmd0aDsgaiA8IGpsOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaiA9PT0gYnJhbmNoSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgd2Fsa1BhcnNlcnModHJlZSwgYnJhbmNoZXNbal0sIHBhcnNlck9iai5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgeiA9IDAsIHpsID0gYnJhbmNoZXNbal0ubGVuZ3RoOyB6IDwgemw7IHorKykge1xuICAgICAgICAgICAgICAgICAgICBicmFuY2hlc1tqXVt6XS5wYXJzZXIuZ29EYXJrKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHBhcnNlck9iai5jaGlsZHJlbikge1xuICAgICAgICAgICAgd2Fsa1BhcnNlcnModHJlZSwgcGFyc2VyT2JqLmNoaWxkcmVuLCBwYXJzZXJPYmouZGF0YSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHdhbGsodHJlZSwgc3RhcnROb2RlLCBlbmROb2RlLCBjb250YWluZXIpIHtcbiAgICB1dGlscy50cmF2ZXJzZU5vQ2hhbmdlTm9kZXMoc3RhcnROb2RlLCBlbmROb2RlLCBmdW5jdGlvbiAoY3VyTm9kZSkge1xuICAgICAgICBpZiAoIWN1ck5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICBzdGFydE5vZGU6IGN1ck5vZGUsXG4gICAgICAgICAgICBub2RlOiBjdXJOb2RlLFxuICAgICAgICAgICAgY29uZmlnOiB0cmVlLmNvbmZpZyxcbiAgICAgICAgICAgIGV4cHJDYWxjdWxhdGVyOiB0cmVlLmV4cHJDYWxjdWxhdGVyXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHBhcnNlck9iajtcblxuICAgICAgICB1dGlscy5lYWNoKFBhcnNlckNsYXNzZXMsIGZ1bmN0aW9uIChQYXJzZXJDbGFzcykge1xuICAgICAgICAgICAgcGFyc2VyT2JqID0gY3JlYXRlUGFyc2VyKFBhcnNlckNsYXNzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmICghcGFyc2VyT2JqIHx8ICFwYXJzZXJPYmoucGFyc2VyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodXRpbHMuaXNBcnJheShwYXJzZXJPYmouY29sbGVjdFJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgYnJhbmNoZXMgPSBwYXJzZXJPYmouY29sbGVjdFJlc3VsdDtcbiAgICAgICAgICAgICAgICBjb250YWluZXIucHVzaCh7cGFyc2VyOiBwYXJzZXJPYmoucGFyc2VyLCBjaGlsZHJlbjogYnJhbmNoZXN9KTtcbiAgICAgICAgICAgICAgICB1dGlscy5lYWNoKGJyYW5jaGVzLCBmdW5jdGlvbiAoYnJhbmNoLCBpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghYnJhbmNoLnN0YXJ0Tm9kZSB8fCAhYnJhbmNoLmVuZE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciBjb24gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgd2Fsayh0cmVlLCBicmFuY2guc3RhcnROb2RlLCBicmFuY2guZW5kTm9kZSwgY29uKTtcbiAgICAgICAgICAgICAgICAgICAgYnJhbmNoZXNbaV0gPSBjb247XG4gICAgICAgICAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgICAgICAgICBjdXJOb2RlID0gcGFyc2VyT2JqLmVuZE5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBjb24gPSBbXTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5wdXNoKHtwYXJzZXI6IHBhcnNlck9iai5wYXJzZXIsIGNoaWxkcmVuOiBjb259KTtcbiAgICAgICAgICAgIGlmIChjdXJOb2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgICAgICAgICAgd2Fsayh0cmVlLCBjdXJOb2RlLmZpcnN0Q2hpbGQsIGN1ck5vZGUubGFzdENoaWxkLCBjb24pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZztcblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIGlmICghcGFyc2VyT2JqKSB7XG4gICAgICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZztcbiAgICAgICAgfVxuICAgIH0sIHRoaXMpO1xufVxuXG4vKipcbiAqIOWIm+W7uuino+aekOWZqOWunuS+i++8jOWFtui/lOWbnuWAvOeahOe7k+aehOS4uu+8mlxuICoge1xuICogICAgIHBhcnNlcjogLi4uLFxuICogICAgIGNvbGxlY3RSZXN1bHQ6IC4uLlxuICogfVxuICpcbiAqIOi/lOWbnuWAvOWtmOWcqOWmguS4i+WHoOenjeaDheWGte+8mlxuICpcbiAqIDHjgIHlpoLmnpwgcGFyc2VyIOWxnuaAp+WtmOWcqOS4lCBjb2xsZWN0UmVzdWx0IOS4uiB0cnVlIO+8jOWImeivtOaYjuW9k+WJjeino+aekOWZqOino+aekOS6huaJgOacieebuOW6lOeahOiKgueCue+8iOWMheaLrOi1t+atouiKgueCuemXtOeahOiKgueCueOAgeW9k+WJjeiKgueCueWSjOWtkOWtmeiKgueCue+8ie+8m1xuICogMuOAgeebtOaOpei/lOWbnuWBh+WAvOaIluiAhSBwYXJzZXIg5LiN5a2Y5Zyo77yM6K+05piO5rKh5pyJ5aSE55CG5Lu75L2V6IqC54K577yM5b2T5YmN6IqC54K55LiN5bGe5LqO5b2T5YmN6Kej5p6Q5Zmo5aSE55CG77ybXG4gKiAz44CBcGFyc2VyIOWtmOWcqOS4lCBjb2xsZWN0UmVzdWx0IOS4uuaVsOe7hO+8jOe7k+aehOWmguS4i++8mlxuICogICAgIFtcbiAqICAgICAgICAge1xuICogICAgICAgICAgICAgc3RhcnROb2RlOiBOb2RlLjwuLi4+LFxuICogICAgICAgICAgICAgZW5kTm9kZTogTm9kZS48Li4uPlxuICogICAgICAgICB9XG4gKiAgICAgXVxuICpcbiAqICDliJnor7TmmI7lvZPliY3mmK/luKbmnInlvojlpJrliIbmlK/nmoToioLngrnvvIzopoHkvp3mrKHop6PmnpDmlbDnu4TkuK3mr4/kuKrlhYPntKDmjIflrprnmoToioLngrnojIPlm7TjgIJcbiAqICDogIzkuJTvvIzor6Xop6PmnpDlmajlr7nlupTnmoQgc2V0RGF0YSgpIOaWueazleWwhuS8mui/lOWbnuaVtOaVsO+8jOaMh+aYjuS9v+eUqOWTquS4gOS4quWIhuaUr+eahOiKgueCueOAglxuICpcbiAqIEBpbm5lclxuICogQHBhcmFtIHtDb25zdHJ1Y3Rvcn0gUGFyc2VyQ2xhc3MgcGFyc2VyIOexu1xuICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zIOWIneWni+WMluWPguaVsFxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgIOi/lOWbnuWAvFxuICovXG5mdW5jdGlvbiBjcmVhdGVQYXJzZXIoUGFyc2VyQ2xhc3MsIG9wdGlvbnMpIHtcbiAgICBpZiAoIVBhcnNlckNsYXNzLmlzUHJvcGVyTm9kZShvcHRpb25zLnN0YXJ0Tm9kZSB8fCBvcHRpb25zLm5vZGUsIG9wdGlvbnMuY29uZmlnKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGVuZE5vZGU7XG4gICAgaWYgKFBhcnNlckNsYXNzLmZpbmRFbmROb2RlKSB7XG4gICAgICAgIGVuZE5vZGUgPSBQYXJzZXJDbGFzcy5maW5kRW5kTm9kZShvcHRpb25zLnN0YXJ0Tm9kZSB8fCBvcHRpb25zLm5vZGUsIG9wdGlvbnMuY29uZmlnKTtcblxuICAgICAgICBpZiAoIWVuZE5vZGUpIHtcbiAgICAgICAgICAgIHRocm93IFBhcnNlckNsYXNzLmdldE5vRW5kTm9kZUVycm9yKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgcGFyc2VyID0gbmV3IFBhcnNlckNsYXNzKHV0aWxzLmV4dGVuZChvcHRpb25zLCB7XG4gICAgICAgIGVuZE5vZGU6IGVuZE5vZGVcbiAgICB9KSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBwYXJzZXI6IHBhcnNlcixcbiAgICAgICAgY29sbGVjdFJlc3VsdDogcGFyc2VyLmNvbGxlY3RFeHBycygpLFxuICAgICAgICBlbmROb2RlOiBlbmROb2RlIHx8IG9wdGlvbnMubm9kZVxuICAgIH07XG59XG5cblxuXG4iLCIvKipcbiAqIEBmaWxlIOe7p+aJv1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbmZ1bmN0aW9uIGluaGVyaXQoQ2hpbGRDbGFzcywgUGFyZW50Q2xhc3MpIHtcbiAgICB2YXIgY2hpbGRQcm90byA9IENoaWxkQ2xhc3MucHJvdG90eXBlO1xuICAgIENoaWxkQ2xhc3MucHJvdG90eXBlID0gbmV3IFBhcmVudENsYXNzKHt9KTtcblxuICAgIHZhciBrZXk7XG4gICAgZm9yIChrZXkgaW4gY2hpbGRQcm90bykge1xuICAgICAgICBpZiAoY2hpbGRQcm90by5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBDaGlsZENsYXNzLnByb3RvdHlwZVtrZXldID0gY2hpbGRQcm90b1trZXldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8g57un5om/6Z2Z5oCB5bGe5oCnXG4gICAgZm9yIChrZXkgaW4gUGFyZW50Q2xhc3MpIHtcbiAgICAgICAgaWYgKFBhcmVudENsYXNzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGlmIChDaGlsZENsYXNzW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIENoaWxkQ2xhc3Nba2V5XSA9IFBhcmVudENsYXNzW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gQ2hpbGRDbGFzcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0O1xuXG4vLyBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdWJDbGFzcywgc3VwZXJDbGFzcykge1xuLy8gICAgIHZhciBFbXB0eSA9IGZ1bmN0aW9uICgpIHt9O1xuLy8gICAgIEVtcHR5LnByb3RvdHlwZSA9IHN1cGVyQ2xhc3MucHJvdG90eXBlO1xuLy8gICAgIHZhciBzZWxmUHJvdG90eXBlID0gc3ViQ2xhc3MucHJvdG90eXBlO1xuLy8gICAgIHZhciBwcm90byA9IHN1YkNsYXNzLnByb3RvdHlwZSA9IG5ldyBFbXB0eSgpO1xuXG4vLyAgICAgZm9yICh2YXIga2V5IGluIHNlbGZQcm90b3R5cGUpIHtcbi8vICAgICAgICAgcHJvdG9ba2V5XSA9IHNlbGZQcm90b3R5cGVba2V5XTtcbi8vICAgICB9XG4vLyAgICAgc3ViQ2xhc3MucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gc3ViQ2xhc3M7XG4vLyAgICAgc3ViQ2xhc3Muc3VwZXJDbGFzcyA9IHN1cGVyQ2xhc3MucHJvdG90eXBlO1xuXG4vLyAgICAgcmV0dXJuIHN1YkNsYXNzO1xuLy8gfTtcbiIsIi8qKlxuICogQGZpbGUg5LiA5aCG6aG555uu6YeM6Z2i5bi455So55qE5pa55rOVXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxuZXhwb3J0cy5zbGljZSA9IGZ1bmN0aW9uIChhcnIsIHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyLCBzdGFydCwgZW5kKTtcbn07XG5cbmV4cG9ydHMuZ29EYXJrID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICBub2RlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgbm9kZS5fX3RleHRfXyA9IG5vZGUubm9kZVZhbHVlO1xuICAgICAgICBub2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgIH1cbn07XG5cbmV4cG9ydHMucmVzdG9yZUZyb21EYXJrID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICBub2RlLnN0eWxlLmRpc3BsYXkgPSBudWxsO1xuICAgIH1cbiAgICBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIGlmIChub2RlLl9fdGV4dF9fICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIG5vZGUubm9kZVZhbHVlID0gbm9kZS5fX3RleHRfXztcbiAgICAgICAgICAgIG5vZGUuX190ZXh0X18gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5leHBvcnRzLmNyZWF0ZUV4cHJGbiA9IGZ1bmN0aW9uIChleHByUmVnRXhwLCBleHByLCBleHByQ2FsY3VsYXRlcikge1xuICAgIGV4cHIgPSBleHByLnJlcGxhY2UoZXhwclJlZ0V4cCwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gYXJndW1lbnRzWzFdO1xuICAgIH0pO1xuICAgIGV4cHJDYWxjdWxhdGVyLmNyZWF0ZUV4cHJGbihleHByKTtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICByZXR1cm4gZXhwckNhbGN1bGF0ZXIuY2FsY3VsYXRlKGV4cHIsIGZhbHNlLCBkYXRhKTtcbiAgICB9O1xufTtcblxuLyoqXG4gKiDotoXnuqfnroDljZXnmoQgZXh0ZW5kIO+8jOWboOS4uuacrOW6k+WvuSBleHRlbmQg5rKh6YKj6auY55qE6KaB5rGC77yMXG4gKiDnrYnliLDmnInopoHmsYLnmoTml7blgJnlho3lrozlloTjgIJcbiAqXG4gKiBAaW5uZXJcbiAqIEBwYXJhbSAge09iamVjdH0gdGFyZ2V0IOebruagh+WvueixoVxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAg5pyA57uI5ZCI5bm25ZCO55qE5a+56LGhXG4gKi9cbmV4cG9ydHMuZXh0ZW5kID0gZnVuY3Rpb24gKHRhcmdldCkge1xuICAgIHZhciBzcmNzID0gZXhwb3J0cy5zbGljZShhcmd1bWVudHMsIDEpO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IHNyY3MubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAvKiBlc2xpbnQtZGlzYWJsZSBndWFyZC1mb3ItaW4gKi9cbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNyY3NbaV0pIHtcbiAgICAgICAgICAgIHRhcmdldFtrZXldID0gc3Jjc1tpXVtrZXldO1xuICAgICAgICB9XG4gICAgICAgIC8qIGVzbGludC1lbmFibGUgZ3VhcmQtZm9yLWluICovXG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59O1xuXG5leHBvcnRzLnRyYXZlcnNlTm9DaGFuZ2VOb2RlcyA9IGZ1bmN0aW9uIChzdGFydE5vZGUsIGVuZE5vZGUsIG5vZGVGbiwgY29udGV4dCkge1xuICAgIGZvciAodmFyIGN1ck5vZGUgPSBzdGFydE5vZGU7XG4gICAgICAgIGN1ck5vZGUgJiYgY3VyTm9kZSAhPT0gZW5kTm9kZTtcbiAgICAgICAgY3VyTm9kZSA9IGN1ck5vZGUubmV4dFNpYmxpbmdcbiAgICApIHtcbiAgICAgICAgaWYgKG5vZGVGbi5jYWxsKGNvbnRleHQsIGN1ck5vZGUpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBub2RlRm4uY2FsbChjb250ZXh0LCBlbmROb2RlKTtcbn07XG5cbmV4cG9ydHMudHJhdmVyc2VOb2RlcyA9IGZ1bmN0aW9uIChzdGFydE5vZGUsIGVuZE5vZGUsIG5vZGVGbiwgY29udGV4dCkge1xuICAgIHZhciBub2RlcyA9IFtdO1xuICAgIGZvciAodmFyIGN1ck5vZGUgPSBzdGFydE5vZGU7XG4gICAgICAgIGN1ck5vZGUgJiYgY3VyTm9kZSAhPT0gZW5kTm9kZTtcbiAgICAgICAgY3VyTm9kZSA9IGN1ck5vZGUubmV4dFNpYmxpbmdcbiAgICApIHtcbiAgICAgICAgbm9kZXMucHVzaChjdXJOb2RlKTtcbiAgICB9XG5cbiAgICBub2Rlcy5wdXNoKGVuZE5vZGUpO1xuXG4gICAgZXhwb3J0cy5lYWNoKG5vZGVzLCBub2RlRm4sIGNvbnRleHQpO1xufTtcblxuZXhwb3J0cy5lYWNoID0gZnVuY3Rpb24gKGFyciwgZm4sIGNvbnRleHQpIHtcbiAgICBpZiAoZXhwb3J0cy5pc0FycmF5KGFycikpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlsID0gYXJyLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChmbi5jYWxsKGNvbnRleHQsIGFycltpXSwgaSwgYXJyKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBhcnIgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGZvciAodmFyIGsgaW4gYXJyKSB7XG4gICAgICAgICAgICBpZiAoZm4uY2FsbChjb250ZXh0LCBhcnJba10sIGssIGFycikpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmV4cG9ydHMuaXNBcnJheSA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuXG5leHBvcnRzLmlzTnVtYmVyID0gZnVuY3Rpb24gKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgTnVtYmVyXSc7XG59O1xuXG5leHBvcnRzLmlzU3ViQ2xhc3NPZiA9IGZ1bmN0aW9uIChTdWJDbGFzcywgU3VwZXJDbGFzcykge1xuICAgIHJldHVybiBTdWJDbGFzcy5wcm90b3R5cGUgaW5zdGFuY2VvZiBTdXBlckNsYXNzO1xufTtcbiIsIndpbmRvdy5FeHByUGFyc2VyID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuLi9zcmMvRXhwclBhcnNlci5qcycpOyJdfQ==
