(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @file 处理了事件的 ExprParser
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var ExprParser = require('./ExprParser');
var inherit = require('./inherit');
var utils = require('./utils');
var Tree = require('./Tree');

function EventExprParser(options) {
    ExprParser.call(this, options);
}

EventExprParser.prototype.initialize = function (options) {
    ExprParser.prototype.initialize.apply(this, arguments);

    this.events = {};
};

EventExprParser.prototype.setData = function (data) {
    ExprParser.prototype.setData.apply(this, arguments);

    this.curData = data;
};

EventExprParser.prototype.addExpr = function (attr) {
    if (!attr) {
        return ExprParser.prototype.addExpr.apply(this, arguments);
    }

    var eventName = getEventName(attr.name, this.config);
    if (eventName) {
        if (this.config.getExprRegExp().test(attr.value)) {
            this.events[eventName] = attr.value;

            var expr = attr.value.replace(
                this.config.getExprRegExp(),
                function () {
                    return arguments[1];
                }
            );
            this.exprCalculater.createExprFn(expr, true);

            var me = this;
            this.node['on' + eventName] = function (event) {
                me.exprCalculater.calculate(expr, true, utils.extend({}, me.curData, {event: event}));
            };
        }
    }
    else {
        ExprParser.prototype.addExpr.apply(this, arguments);
    }
};

module.exports = inherit(EventExprParser, ExprParser);
Tree.registeParser(module.exports);


function getEventName(attrName, config) {
    if (attrName.indexOf(config.eventPrefix + '-') === -1) {
        return;
    }

    return attrName.replace(config.eventPrefix + '-', '');
}


},{"./ExprParser":3,"./Tree":5,"./inherit":6,"./utils":7}],2:[function(require,module,exports){
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

},{"./utils":7}],3:[function(require,module,exports){
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

},{"./Parser":4,"./Tree":5,"./inherit":6,"./utils":7}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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




},{"./ExprCalculater":2,"./utils":7}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
window.EventExprParser = module.exports = require('../src/EventExprParser.js');
},{"../src/EventExprParser.js":1}]},{},[8])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9FdmVudEV4cHJQYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvRXhwckNhbGN1bGF0ZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvRXhwclBhcnNlci5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9QYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvVHJlZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9pbmhlcml0LmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL3V0aWxzLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvdG1wL2Zha2VfYWJhYWQ3MzIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAZmlsZSDlpITnkIbkuobkuovku7bnmoQgRXhwclBhcnNlclxuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbnZhciBFeHByUGFyc2VyID0gcmVxdWlyZSgnLi9FeHByUGFyc2VyJyk7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJy4vaW5oZXJpdCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIFRyZWUgPSByZXF1aXJlKCcuL1RyZWUnKTtcblxuZnVuY3Rpb24gRXZlbnRFeHByUGFyc2VyKG9wdGlvbnMpIHtcbiAgICBFeHByUGFyc2VyLmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG5cbkV2ZW50RXhwclBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgRXhwclBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5ldmVudHMgPSB7fTtcbn07XG5cbkV2ZW50RXhwclBhcnNlci5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgRXhwclBhcnNlci5wcm90b3R5cGUuc2V0RGF0YS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5jdXJEYXRhID0gZGF0YTtcbn07XG5cbkV2ZW50RXhwclBhcnNlci5wcm90b3R5cGUuYWRkRXhwciA9IGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgaWYgKCFhdHRyKSB7XG4gICAgICAgIHJldHVybiBFeHByUGFyc2VyLnByb3RvdHlwZS5hZGRFeHByLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgdmFyIGV2ZW50TmFtZSA9IGdldEV2ZW50TmFtZShhdHRyLm5hbWUsIHRoaXMuY29uZmlnKTtcbiAgICBpZiAoZXZlbnROYW1lKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5nZXRFeHByUmVnRXhwKCkudGVzdChhdHRyLnZhbHVlKSkge1xuICAgICAgICAgICAgdGhpcy5ldmVudHNbZXZlbnROYW1lXSA9IGF0dHIudmFsdWU7XG5cbiAgICAgICAgICAgIHZhciBleHByID0gYXR0ci52YWx1ZS5yZXBsYWNlKFxuICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLmdldEV4cHJSZWdFeHAoKSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmd1bWVudHNbMV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRoaXMuZXhwckNhbGN1bGF0ZXIuY3JlYXRlRXhwckZuKGV4cHIsIHRydWUpO1xuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgdGhpcy5ub2RlWydvbicgKyBldmVudE5hbWVdID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgbWUuZXhwckNhbGN1bGF0ZXIuY2FsY3VsYXRlKGV4cHIsIHRydWUsIHV0aWxzLmV4dGVuZCh7fSwgbWUuY3VyRGF0YSwge2V2ZW50OiBldmVudH0pKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIEV4cHJQYXJzZXIucHJvdG90eXBlLmFkZEV4cHIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGluaGVyaXQoRXZlbnRFeHByUGFyc2VyLCBFeHByUGFyc2VyKTtcblRyZWUucmVnaXN0ZVBhcnNlcihtb2R1bGUuZXhwb3J0cyk7XG5cblxuZnVuY3Rpb24gZ2V0RXZlbnROYW1lKGF0dHJOYW1lLCBjb25maWcpIHtcbiAgICBpZiAoYXR0ck5hbWUuaW5kZXhPZihjb25maWcuZXZlbnRQcmVmaXggKyAnLScpID09PSAtMSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcmV0dXJuIGF0dHJOYW1lLnJlcGxhY2UoY29uZmlnLmV2ZW50UHJlZml4ICsgJy0nLCAnJyk7XG59XG5cbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuZnVuY3Rpb24gRXhwckNhbGN1bGF0ZXIoKSB7XG4gICAgdGhpcy5mbnMgPSB7fTtcblxuICAgIHRoaXMuZXhwck5hbWVNYXAgPSB7fTtcbiAgICB0aGlzLmV4cHJOYW1lUmVnRXhwID0gL1xcLj9cXCQ/KFthLXp8QS1aXSt8KFthLXp8QS1aXStbMC05XStbYS16fEEtWl0qKSkvZztcbn1cblxuRXhwckNhbGN1bGF0ZXIucHJvdG90eXBlLmNyZWF0ZUV4cHJGbiA9IGZ1bmN0aW9uIChleHByLCBhdm9pZFJldHVybikge1xuICAgIGF2b2lkUmV0dXJuID0gISFhdm9pZFJldHVybjtcbiAgICB0aGlzLmZuc1tleHByXSA9IHRoaXMuZm5zW2V4cHJdIHx8IHt9O1xuICAgIGlmICh0aGlzLmZuc1tleHByXVthdm9pZFJldHVybl0pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBwYXJhbXMgPSBnZXRWYXJpYWJsZU5hbWVzRnJvbUV4cHIodGhpcywgZXhwcik7XG4gICAgdmFyIGZuID0gbmV3IEZ1bmN0aW9uKHBhcmFtcywgKGF2b2lkUmV0dXJuID8gJycgOiAncmV0dXJuICcpICsgZXhwcik7XG5cbiAgICB0aGlzLmZuc1tleHByXVthdm9pZFJldHVybl0gPSB7XG4gICAgICAgIHBhcmFtTmFtZXM6IHBhcmFtcyxcbiAgICAgICAgZm46IGZuXG4gICAgfTtcbn07XG5cbkV4cHJDYWxjdWxhdGVyLnByb3RvdHlwZS5jYWxjdWxhdGUgPSBmdW5jdGlvbiAoZXhwciwgYXZvaWRSZXR1cm4sIGRhdGEpIHtcbiAgICB2YXIgZm5PYmogPSB0aGlzLmZuc1tleHByXVthdm9pZFJldHVybl07XG4gICAgaWYgKCFmbk9iaikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIHN1Y2ggZXhwcmVzc2lvbiBmdW5jdGlvbiBjcmVhdGVkIScpO1xuICAgIH1cblxuICAgIHZhciBmbkFyZ3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBmbk9iai5wYXJhbU5hbWVzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcmFtID0gZm5PYmoucGFyYW1OYW1lc1tpXTtcbiAgICAgICAgdmFyIHZhbHVlID0gZGF0YVtwYXJhbV07XG4gICAgICAgIGZuQXJncy5wdXNoKHZhbHVlID09PSB1bmRlZmluZWQgPyAnJyA6IHZhbHVlKTtcbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0O1xuICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGZuT2JqLmZuLmFwcGx5KG51bGwsIGZuQXJncyk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIHJlc3VsdCA9ICcnO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFeHByQ2FsY3VsYXRlcjtcblxuLyoqXG4gKiDku47ooajovr7lvI/kuK3mir3nprvlh7rlj5jph4/lkI1cbiAqXG4gKiBAaW5uZXJcbiAqIEBwYXJhbSB7RXhwckNhbGN1bGF0ZXJ9IG1lIOWvueW6lOWunuS+i1xuICogQHBhcmFtICB7c3RyaW5nfSBleHByIOihqOi+vuW8j+Wtl+espuS4su+8jOexu+S8vOS6jiBgJHtuYW1lfWAg5Lit55qEIG5hbWVcbiAqIEByZXR1cm4ge0FycmF5LjxzdHJpbmc+fSAgICAgIOWPmOmHj+WQjeaVsOe7hFxuICovXG5mdW5jdGlvbiBnZXRWYXJpYWJsZU5hbWVzRnJvbUV4cHIobWUsIGV4cHIpIHtcbiAgICBpZiAobWUuZXhwck5hbWVNYXBbZXhwcl0pIHtcbiAgICAgICAgcmV0dXJuIG1lLmV4cHJOYW1lTWFwW2V4cHJdO1xuICAgIH1cblxuICAgIHZhciBtYXRjaGVzID0gZXhwci5tYXRjaChtZS5leHByTmFtZVJlZ0V4cCkgfHwgW107XG4gICAgdmFyIG5hbWVzID0ge307XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gbWF0Y2hlcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIGlmIChtYXRjaGVzW2ldICYmIG1hdGNoZXNbaV1bMF0gIT09ICcuJykge1xuICAgICAgICAgICAgbmFtZXNbbWF0Y2hlc1tpXV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHJldCA9IFtdO1xuICAgIHV0aWxzLmVhY2gobmFtZXMsIGZ1bmN0aW9uIChpc09rLCBuYW1lKSB7XG4gICAgICAgIGlmIChpc09rKSB7XG4gICAgICAgICAgICByZXQucHVzaChuYW1lKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIG1lLmV4cHJOYW1lTWFwW2V4cHJdID0gcmV0O1xuXG4gICAgcmV0dXJuIHJldDtcbn1cbiIsIi8qKlxuICogQGZpbGUg6KGo6L6+5byP6Kej5p6Q5Zmo77yM5LiA5Liq5paH5pys6IqC54K55oiW6ICF5YWD57Sg6IqC54K55a+55bqU5LiA5Liq6KGo6L6+5byP6Kej5p6Q5Zmo5a6e5L6LXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxudmFyIFBhcnNlciA9IHJlcXVpcmUoJy4vUGFyc2VyJyk7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJy4vaW5oZXJpdCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIFRyZWUgPSByZXF1aXJlKCcuL1RyZWUnKTtcblxuZnVuY3Rpb24gRXhwclBhcnNlcihvcHRpb25zKSB7XG4gICAgUGFyc2VyLmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG5cbkV4cHJQYXJzZXIucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIFBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5ub2RlID0gb3B0aW9ucy5ub2RlO1xuICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG5cbiAgICB0aGlzLmV4cHJzID0gW107XG4gICAgdGhpcy5leHByRm5zID0ge307XG4gICAgdGhpcy51cGRhdGVGbnMgPSB7fTtcbiAgICB0aGlzLmV4cHJPbGRWYWx1ZXMgPSB7fTtcbn07XG5cbi8qKlxuICog5pCc6ZuG6L+H56iLXG4gKlxuICogQHB1YmxpY1xuICovXG5FeHByUGFyc2VyLnByb3RvdHlwZS5jb2xsZWN0RXhwcnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1ck5vZGUgPSB0aGlzLm5vZGU7XG5cbiAgICAvLyDmlofmnKzoioLngrlcbiAgICBpZiAoY3VyTm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICB0aGlzLmFkZEV4cHIoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8g5YWD57Sg6IqC54K5XG4gICAgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBjdXJOb2RlLmF0dHJpYnV0ZXM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGF0dHJpYnV0ZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5hZGRFeHByKGF0dHJpYnV0ZXNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICog5re75Yqg6KGo6L6+5byPXG4gKlxuICogQHByb3RlY3RlZFxuICogQHBhcmFtIHtBdHRyfSBhdHRyIOWmguaenOW9k+WJjeaYr+WFg+e0oOiKgueCue+8jOWImeimgeS8oOWFpemBjeWOhuWIsOeahOWxnuaAp1xuICovXG5FeHByUGFyc2VyLnByb3RvdHlwZS5hZGRFeHByID0gZnVuY3Rpb24gKGF0dHIpIHtcbiAgICB2YXIgZXhwciA9IGF0dHIgPyBhdHRyLnZhbHVlIDogdGhpcy5ub2RlLm5vZGVWYWx1ZTtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmdldEV4cHJSZWdFeHAoKS50ZXN0KGV4cHIpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYWRkRXhwcihcbiAgICAgICAgdGhpcyxcbiAgICAgICAgZXhwcixcbiAgICAgICAgYXR0ciA/IGNyZWF0ZUF0dHJVcGRhdGVGbihhdHRyKSA6IChmdW5jdGlvbiAoY3VyTm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChleHByVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBjdXJOb2RlLm5vZGVWYWx1ZSA9IGV4cHJWYWx1ZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pKHRoaXMubm9kZSlcbiAgICApO1xufTtcblxuLyoqXG4gKiDorr7nva7mlbDmja7ov4fnqItcbiAqXG4gKiBAcHVibGljXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSDmlbDmja5cbiAqL1xuRXhwclBhcnNlci5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGV4cHJzID0gdGhpcy5leHBycztcbiAgICB2YXIgZXhwck9sZFZhbHVlcyA9IHRoaXMuZXhwck9sZFZhbHVlcztcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBleHBycy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIHZhciBleHByID0gZXhwcnNbaV07XG4gICAgICAgIHZhciBleHByVmFsdWUgPSB0aGlzLmV4cHJGbnNbZXhwcl0oZGF0YSk7XG5cbiAgICAgICAgaWYgKHRoaXMuZGlydHlDaGVjayhleHByLCBleHByVmFsdWUsIGV4cHJPbGRWYWx1ZXNbZXhwcl0pKSB7XG4gICAgICAgICAgICB2YXIgdXBkYXRlRm5zID0gdGhpcy51cGRhdGVGbnNbZXhwcl07XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMCwgamwgPSB1cGRhdGVGbnMubGVuZ3RoOyBqIDwgamw7IGorKykge1xuICAgICAgICAgICAgICAgIHVwZGF0ZUZuc1tqXShleHByVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwck9sZFZhbHVlc1tleHByXSA9IGV4cHJWYWx1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIOiKgueCueKAnOmakOiXj+KAnei1t+adpVxuICpcbiAqIEBwdWJsaWNcbiAqL1xuRXhwclBhcnNlci5wcm90b3R5cGUuZ29EYXJrID0gZnVuY3Rpb24gKCkge1xuICAgIHV0aWxzLmdvRGFyayh0aGlzLm5vZGUpO1xufTtcblxuLyoqXG4gKiDoioLngrnigJzmmL7npLrigJ3lh7rmnaVcbiAqXG4gKiBAcHVibGljXG4gKi9cbkV4cHJQYXJzZXIucHJvdG90eXBlLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy5yZXN0b3JlRnJvbURhcmsodGhpcy5ub2RlKTtcbn07XG5cbkV4cHJQYXJzZXIuaXNQcm9wZXJOb2RlID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5ub2RlVHlwZSA9PT0gMSB8fCBub2RlLm5vZGVUeXBlID09PSAzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0KEV4cHJQYXJzZXIsIFBhcnNlcilcblRyZWUucmVnaXN0ZVBhcnNlcihtb2R1bGUuZXhwb3J0cyk7XG5cbmZ1bmN0aW9uIGNyZWF0ZUF0dHJVcGRhdGVGbihhdHRyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChleHByVmFsdWUpIHtcbiAgICAgICAgYXR0ci52YWx1ZSA9IGV4cHJWYWx1ZTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBhZGRFeHByKHBhcnNlciwgZXhwciwgdXBkYXRlRm4pIHtcbiAgICBwYXJzZXIuZXhwcnMucHVzaChleHByKTtcbiAgICBpZiAoIXBhcnNlci5leHByRm5zW2V4cHJdKSB7XG4gICAgICAgIHBhcnNlci5leHByRm5zW2V4cHJdID0gY3JlYXRlRXhwckZuKHBhcnNlciwgZXhwcik7XG4gICAgfVxuICAgIHBhcnNlci51cGRhdGVGbnNbZXhwcl0gPSBwYXJzZXIudXBkYXRlRm5zW2V4cHJdIHx8IFtdO1xuICAgIHBhcnNlci51cGRhdGVGbnNbZXhwcl0ucHVzaCh1cGRhdGVGbik7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUV4cHJGbihwYXJzZXIsIGV4cHIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGV4cHIucmVwbGFjZShwYXJzZXIuY29uZmlnLmdldEV4cHJSZWdFeHAoKSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcGFyc2VyLmV4cHJDYWxjdWxhdGVyLmNyZWF0ZUV4cHJGbihhcmd1bWVudHNbMV0pO1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlci5leHByQ2FsY3VsYXRlci5jYWxjdWxhdGUoYXJndW1lbnRzWzFdLCBmYWxzZSwgZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG4iLCIvKipcbiAqIEBmaWxlIOino+aekOWZqOeahOaKveixoeWfuuexu1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbi8qKlxuICog5p6E6YCg5Ye95pWwXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDphY3nva7lj4LmlbDvvIzkuIDoiKzlj6/og73kvJrmnInlpoLkuIvlhoXlrrnvvJpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydE5vZGU6IC4uLixcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmROb2RlOiAuLi4sXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogLi4uLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZzogLi4uXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICDlhbfkvZPmmK/llaXlj6/ku6Xlj4LliqDlhbfkvZPnmoTlrZDnsbtcbiAqL1xuZnVuY3Rpb24gUGFyc2VyKG9wdGlvbnMpIHtcbiAgICB0aGlzLmluaXRpYWxpemUob3B0aW9ucyk7XG59XG5cbi8qKlxuICog5Yid5aeL5YyWXG4gKlxuICogQHByb3RlY3RlZMOfXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDmnaXoh6rkuo7mnoTpgKDlh73mlbBcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB0aGlzLmV4cHJDYWxjdWxhdGVyID0gb3B0aW9ucy5leHByQ2FsY3VsYXRlcjtcbiAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xufTtcblxuLyoqXG4gKiDplIDmr4Hop6PmnpDlmahcbiAqXG4gKiBAcHVibGljXG4gKiBAYWJzdHJhY3RcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge307XG5cbi8qKlxuICog6K6+572u5pWw5o2uXG4gKlxuICogQHB1YmxpY1xuICogQGFic3RyYWN0XG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSDopoHorr7nva7nmoTmlbDmja5cbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHt9O1xuXG4vKipcbiAqIOmakOiXj+ebuOWFs+WFg+e0oFxuICpcbiAqIEBwdWJsaWNcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5nb0RhcmsgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDmmL7npLrnm7jlhbPlhYPntKBcbiAqXG4gKiBAcHVibGljXG4gKi9cblBhcnNlci5wcm90b3R5cGUucmVzdG9yZUZyb21EYXJrID0gZnVuY3Rpb24gKCkge307XG5cbi8qKlxuICog5pCc6ZuG6KGo6L6+5byP77yM55Sf5oiQ6KGo6L6+5byP5Ye95pWw5ZKMIERPTSDmm7TmlrDlh73mlbBcbiAqXG4gKiBAYWJzdHJhY3RcbiAqIEBwdWJsaWNcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5jb2xsZWN0RXhwcnMgPSBmdW5jdGlvbiAoKSB7fTtcblxuUGFyc2VyLnByb3RvdHlwZS5kaXJ0eUNoZWNrID0gZnVuY3Rpb24gKGV4cHIsIGV4cHJWYWx1ZSwgZXhwck9sZFZhbHVlKSB7XG4gICAgdmFyIGRpcnR5Q2hlY2tlckZuID0gdGhpcy5kaXJ0eUNoZWNrZXIgPyB0aGlzLmRpcnR5Q2hlY2tlci5nZXRDaGVja2VyKGV4cHIpIDogbnVsbDtcbiAgICByZXR1cm4gKGRpcnR5Q2hlY2tlckZuICYmIGRpcnR5Q2hlY2tlckZuKGV4cHIsIGV4cHJWYWx1ZSwgZXhwck9sZFZhbHVlKSlcbiAgICAgICAgICAgIHx8ICghZGlydHlDaGVja2VyRm4gJiYgZXhwclZhbHVlICE9PSBleHByT2xkVmFsdWUpO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5zZXREaXJ0eUNoZWNrZXIgPSBmdW5jdGlvbiAoZGlydHlDaGVja2VyKSB7XG4gICAgdGhpcy5kaXJ0eUNoZWNrZXIgPSBkaXJ0eUNoZWNrZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhcnNlcjtcbiIsIi8qKlxuICogQGZpbGUg5pyA57uI55qE5qCRXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIEV4cHJDYWxjdWxhdGVyID0gcmVxdWlyZSgnLi9FeHByQ2FsY3VsYXRlcicpO1xuXG5mdW5jdGlvbiBUcmVlKG9wdGlvbnMpIHtcbiAgICB0aGlzLnN0YXJ0Tm9kZSA9IG9wdGlvbnMuc3RhcnROb2RlO1xuICAgIHRoaXMuZW5kTm9kZSA9IG9wdGlvbnMuZW5kTm9kZTtcbiAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xuICAgIHRoaXMuZXhwckNhbGN1bGF0ZXIgPSBuZXcgRXhwckNhbGN1bGF0ZXIoKTtcblxuICAgIHRoaXMudHJlZSA9IFtdO1xufVxuXG5UcmVlLnByb3RvdHlwZS50cmF2ZXJzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB3YWxrKHRoaXMsIHRoaXMuc3RhcnROb2RlLCB0aGlzLmVuZE5vZGUsIHRoaXMudHJlZSk7XG59O1xuXG5UcmVlLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBkYXRhID0gZGF0YSB8fCB7fTtcbiAgICB3YWxrUGFyc2Vycyh0aGlzLCB0aGlzLnRyZWUsIGRhdGEpO1xufTtcblxuVHJlZS5wcm90b3R5cGUuZ29EYXJrID0gZnVuY3Rpb24gKCkge1xuICAgIHV0aWxzLnRyYXZlcnNlTm9DaGFuZ2VOb2Rlcyh0aGlzLnN0YXJ0Tm9kZSwgdGhpcy5lbmROb2RlLCBmdW5jdGlvbiAoY3VyTm9kZSkge1xuICAgICAgICBpZiAoY3VyTm9kZS5ub2RlVHlwZSA9PT0gMSB8fCBjdXJOb2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgICAgICB1dGlscy5nb0RhcmsoY3VyTm9kZSk7XG4gICAgICAgIH1cbiAgICB9LCB0aGlzKTtcbn07XG5cblRyZWUucHJvdG90eXBlLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy50cmF2ZXJzZU5vQ2hhbmdlTm9kZXModGhpcy5zdGFydE5vZGUsIHRoaXMuZW5kTm9kZSwgZnVuY3Rpb24gKGN1ck5vZGUpIHtcbiAgICAgICAgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDEgfHwgY3VyTm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICAgICAgdXRpbHMucmVzdG9yZUZyb21EYXJrKGN1ck5vZGUpO1xuICAgICAgICB9XG4gICAgfSwgdGhpcyk7XG59O1xuXG5UcmVlLnByb3RvdHlwZS5zZXREaXJ0eUNoZWNrZXIgPSBmdW5jdGlvbiAoZGlydHlDaGVja2VyKSB7XG4gICAgdGhpcy5kaXJ0eUNoZWNrZXIgPSBkaXJ0eUNoZWNrZXI7XG59O1xuXG52YXIgUGFyc2VyQ2xhc3NlcyA9IFtdO1xud2luZG93LlBhcnNlckNsYXNzZXMgPSBQYXJzZXJDbGFzc2VzO1xuXG4vKipcbiAqIOazqOWGjOS4gOS4i+ino+aekOWZqOexu+OAglxuICpcbiAqIEBwYXJhbSAge0NvbnN0cnVjdG9yfSBQYXJzZXJDbGFzcyDop6PmnpDlmajnsbtcbiAqL1xuVHJlZS5yZWdpc3RlUGFyc2VyID0gZnVuY3Rpb24gKFBhcnNlckNsYXNzKSB7XG4gICAgdmFyIGlzRXhpdHNDaGlsZENsYXNzID0gZmFsc2U7XG4gICAgdXRpbHMuZWFjaChQYXJzZXJDbGFzc2VzLCBmdW5jdGlvbiAoUEMsIGluZGV4KSB7XG4gICAgICAgIGlmICh1dGlscy5pc1N1YkNsYXNzT2YoUEMsIFBhcnNlckNsYXNzKSkge1xuICAgICAgICAgICAgaXNFeGl0c0NoaWxkQ2xhc3MgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHV0aWxzLmlzU3ViQ2xhc3NPZihQYXJzZXJDbGFzcywgUEMpKSB7XG4gICAgICAgICAgICBQYXJzZXJDbGFzc2VzW2luZGV4XSA9IFBhcnNlckNsYXNzO1xuICAgICAgICAgICAgaXNFeGl0c0NoaWxkQ2xhc3MgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGlzRXhpdHNDaGlsZENsYXNzO1xuICAgIH0pO1xuXG4gICAgaWYgKCFpc0V4aXRzQ2hpbGRDbGFzcykge1xuICAgICAgICBQYXJzZXJDbGFzc2VzLnB1c2goUGFyc2VyQ2xhc3MpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVHJlZTtcblxuZnVuY3Rpb24gd2Fsa1BhcnNlcnModHJlZSwgcGFyc2VycywgZGF0YSkge1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IHBhcnNlcnMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICB2YXIgcGFyc2VyT2JqID0gcGFyc2Vyc1tpXTtcbiAgICAgICAgcGFyc2VyT2JqLnBhcnNlci5zZXREaXJ0eUNoZWNrZXIodHJlZS5kaXJ0eUNoZWNrZXIpO1xuICAgICAgICBwYXJzZXJPYmouZGF0YSA9IHV0aWxzLmV4dGVuZCh7fSwgcGFyc2VyT2JqLmRhdGEgfHwge30sIGRhdGEpO1xuXG4gICAgICAgIHBhcnNlck9iai5wYXJzZXIucmVzdG9yZUZyb21EYXJrKCk7XG4gICAgICAgIHZhciByZXN1bHQgPSBwYXJzZXJPYmoucGFyc2VyLnNldERhdGEocGFyc2VyT2JqLmRhdGEpO1xuICAgICAgICBpZiAodXRpbHMuaXNOdW1iZXIocmVzdWx0KSkge1xuICAgICAgICAgICAgdmFyIGJyYW5jaEluZGV4ID0gcmVzdWx0O1xuICAgICAgICAgICAgdmFyIGJyYW5jaGVzID0gcGFyc2VyT2JqLmNoaWxkcmVuO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDAsIGpsID0gYnJhbmNoZXMubGVuZ3RoOyBqIDwgamw7IGorKykge1xuICAgICAgICAgICAgICAgIGlmIChqID09PSBicmFuY2hJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICB3YWxrUGFyc2Vycyh0cmVlLCBicmFuY2hlc1tqXSwgcGFyc2VyT2JqLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciB6ID0gMCwgemwgPSBicmFuY2hlc1tqXS5sZW5ndGg7IHogPCB6bDsgeisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyYW5jaGVzW2pdW3pdLnBhcnNlci5nb0RhcmsoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocGFyc2VyT2JqLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICB3YWxrUGFyc2Vycyh0cmVlLCBwYXJzZXJPYmouY2hpbGRyZW4sIHBhcnNlck9iai5kYXRhKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gd2Fsayh0cmVlLCBzdGFydE5vZGUsIGVuZE5vZGUsIGNvbnRhaW5lcikge1xuICAgIHV0aWxzLnRyYXZlcnNlTm9DaGFuZ2VOb2RlcyhzdGFydE5vZGUsIGVuZE5vZGUsIGZ1bmN0aW9uIChjdXJOb2RlKSB7XG4gICAgICAgIGlmICghY3VyTm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHN0YXJ0Tm9kZTogY3VyTm9kZSxcbiAgICAgICAgICAgIG5vZGU6IGN1ck5vZGUsXG4gICAgICAgICAgICBjb25maWc6IHRyZWUuY29uZmlnLFxuICAgICAgICAgICAgZXhwckNhbGN1bGF0ZXI6IHRyZWUuZXhwckNhbGN1bGF0ZXJcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcGFyc2VyT2JqO1xuXG4gICAgICAgIHV0aWxzLmVhY2goUGFyc2VyQ2xhc3NlcywgZnVuY3Rpb24gKFBhcnNlckNsYXNzKSB7XG4gICAgICAgICAgICBwYXJzZXJPYmogPSBjcmVhdGVQYXJzZXIoUGFyc2VyQ2xhc3MsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKCFwYXJzZXJPYmogfHwgIXBhcnNlck9iai5wYXJzZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh1dGlscy5pc0FycmF5KHBhcnNlck9iai5jb2xsZWN0UmVzdWx0KSkge1xuICAgICAgICAgICAgICAgIHZhciBicmFuY2hlcyA9IHBhcnNlck9iai5jb2xsZWN0UmVzdWx0O1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5wdXNoKHtwYXJzZXI6IHBhcnNlck9iai5wYXJzZXIsIGNoaWxkcmVuOiBicmFuY2hlc30pO1xuICAgICAgICAgICAgICAgIHV0aWxzLmVhY2goYnJhbmNoZXMsIGZ1bmN0aW9uIChicmFuY2gsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFicmFuY2guc3RhcnROb2RlIHx8ICFicmFuY2guZW5kTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbiA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB3YWxrKHRyZWUsIGJyYW5jaC5zdGFydE5vZGUsIGJyYW5jaC5lbmROb2RlLCBjb24pO1xuICAgICAgICAgICAgICAgICAgICBicmFuY2hlc1tpXSA9IGNvbjtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICAgICAgICAgIGN1ck5vZGUgPSBwYXJzZXJPYmouZW5kTm9kZS5uZXh0U2libGluZztcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGNvbiA9IFtdO1xuICAgICAgICAgICAgY29udGFpbmVyLnB1c2goe3BhcnNlcjogcGFyc2VyT2JqLnBhcnNlciwgY2hpbGRyZW46IGNvbn0pO1xuICAgICAgICAgICAgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgICAgICAgICB3YWxrKHRyZWUsIGN1ck5vZGUuZmlyc3RDaGlsZCwgY3VyTm9kZS5sYXN0Q2hpbGQsIGNvbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nO1xuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgaWYgKCFwYXJzZXJPYmopIHtcbiAgICAgICAgICAgIGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nO1xuICAgICAgICB9XG4gICAgfSwgdGhpcyk7XG59XG5cbi8qKlxuICog5Yib5bu66Kej5p6Q5Zmo5a6e5L6L77yM5YW26L+U5Zue5YC855qE57uT5p6E5Li677yaXG4gKiB7XG4gKiAgICAgcGFyc2VyOiAuLi4sXG4gKiAgICAgY29sbGVjdFJlc3VsdDogLi4uXG4gKiB9XG4gKlxuICog6L+U5Zue5YC85a2Y5Zyo5aaC5LiL5Yeg56eN5oOF5Ya177yaXG4gKlxuICogMeOAgeWmguaenCBwYXJzZXIg5bGe5oCn5a2Y5Zyo5LiUIGNvbGxlY3RSZXN1bHQg5Li6IHRydWUg77yM5YiZ6K+05piO5b2T5YmN6Kej5p6Q5Zmo6Kej5p6Q5LqG5omA5pyJ55u45bqU55qE6IqC54K577yI5YyF5ous6LW35q2i6IqC54K56Ze055qE6IqC54K544CB5b2T5YmN6IqC54K55ZKM5a2Q5a2Z6IqC54K577yJ77ybXG4gKiAy44CB55u05o6l6L+U5Zue5YGH5YC85oiW6ICFIHBhcnNlciDkuI3lrZjlnKjvvIzor7TmmI7msqHmnInlpITnkIbku7vkvZXoioLngrnvvIzlvZPliY3oioLngrnkuI3lsZ7kuo7lvZPliY3op6PmnpDlmajlpITnkIbvvJtcbiAqIDPjgIFwYXJzZXIg5a2Y5Zyo5LiUIGNvbGxlY3RSZXN1bHQg5Li65pWw57uE77yM57uT5p6E5aaC5LiL77yaXG4gKiAgICAgW1xuICogICAgICAgICB7XG4gKiAgICAgICAgICAgICBzdGFydE5vZGU6IE5vZGUuPC4uLj4sXG4gKiAgICAgICAgICAgICBlbmROb2RlOiBOb2RlLjwuLi4+XG4gKiAgICAgICAgIH1cbiAqICAgICBdXG4gKlxuICogIOWImeivtOaYjuW9k+WJjeaYr+W4puacieW+iOWkmuWIhuaUr+eahOiKgueCue+8jOimgeS+neasoeino+aekOaVsOe7hOS4reavj+S4quWFg+e0oOaMh+WumueahOiKgueCueiMg+WbtOOAglxuICogIOiAjOS4lO+8jOivpeino+aekOWZqOWvueW6lOeahCBzZXREYXRhKCkg5pa55rOV5bCG5Lya6L+U5Zue5pW05pWw77yM5oyH5piO5L2/55So5ZOq5LiA5Liq5YiG5pSv55qE6IqC54K544CCXG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0ge0NvbnN0cnVjdG9yfSBQYXJzZXJDbGFzcyBwYXJzZXIg57G7XG4gKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnMg5Yid5aeL5YyW5Y+C5pWwXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAg6L+U5Zue5YC8XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVBhcnNlcihQYXJzZXJDbGFzcywgb3B0aW9ucykge1xuICAgIGlmICghUGFyc2VyQ2xhc3MuaXNQcm9wZXJOb2RlKG9wdGlvbnMuc3RhcnROb2RlIHx8IG9wdGlvbnMubm9kZSwgb3B0aW9ucy5jb25maWcpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZW5kTm9kZTtcbiAgICBpZiAoUGFyc2VyQ2xhc3MuZmluZEVuZE5vZGUpIHtcbiAgICAgICAgZW5kTm9kZSA9IFBhcnNlckNsYXNzLmZpbmRFbmROb2RlKG9wdGlvbnMuc3RhcnROb2RlIHx8IG9wdGlvbnMubm9kZSwgb3B0aW9ucy5jb25maWcpO1xuXG4gICAgICAgIGlmICghZW5kTm9kZSkge1xuICAgICAgICAgICAgdGhyb3cgUGFyc2VyQ2xhc3MuZ2V0Tm9FbmROb2RlRXJyb3IoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBwYXJzZXIgPSBuZXcgUGFyc2VyQ2xhc3ModXRpbHMuZXh0ZW5kKG9wdGlvbnMsIHtcbiAgICAgICAgZW5kTm9kZTogZW5kTm9kZVxuICAgIH0pKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHBhcnNlcjogcGFyc2VyLFxuICAgICAgICBjb2xsZWN0UmVzdWx0OiBwYXJzZXIuY29sbGVjdEV4cHJzKCksXG4gICAgICAgIGVuZE5vZGU6IGVuZE5vZGUgfHwgb3B0aW9ucy5ub2RlXG4gICAgfTtcbn1cblxuXG5cbiIsIi8qKlxuICogQGZpbGUg57un5om/XG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxuZnVuY3Rpb24gaW5oZXJpdChDaGlsZENsYXNzLCBQYXJlbnRDbGFzcykge1xuICAgIHZhciBjaGlsZFByb3RvID0gQ2hpbGRDbGFzcy5wcm90b3R5cGU7XG4gICAgQ2hpbGRDbGFzcy5wcm90b3R5cGUgPSBuZXcgUGFyZW50Q2xhc3Moe30pO1xuXG4gICAgdmFyIGtleTtcbiAgICBmb3IgKGtleSBpbiBjaGlsZFByb3RvKSB7XG4gICAgICAgIGlmIChjaGlsZFByb3RvLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIENoaWxkQ2xhc3MucHJvdG90eXBlW2tleV0gPSBjaGlsZFByb3RvW2tleV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDnu6fmib/pnZnmgIHlsZ7mgKdcbiAgICBmb3IgKGtleSBpbiBQYXJlbnRDbGFzcykge1xuICAgICAgICBpZiAoUGFyZW50Q2xhc3MuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaWYgKENoaWxkQ2xhc3Nba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgQ2hpbGRDbGFzc1trZXldID0gUGFyZW50Q2xhc3Nba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBDaGlsZENsYXNzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluaGVyaXQ7XG5cbi8vIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7XG4vLyAgICAgdmFyIEVtcHR5ID0gZnVuY3Rpb24gKCkge307XG4vLyAgICAgRW1wdHkucHJvdG90eXBlID0gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG4vLyAgICAgdmFyIHNlbGZQcm90b3R5cGUgPSBzdWJDbGFzcy5wcm90b3R5cGU7XG4vLyAgICAgdmFyIHByb3RvID0gc3ViQ2xhc3MucHJvdG90eXBlID0gbmV3IEVtcHR5KCk7XG5cbi8vICAgICBmb3IgKHZhciBrZXkgaW4gc2VsZlByb3RvdHlwZSkge1xuLy8gICAgICAgICBwcm90b1trZXldID0gc2VsZlByb3RvdHlwZVtrZXldO1xuLy8gICAgIH1cbi8vICAgICBzdWJDbGFzcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBzdWJDbGFzcztcbi8vICAgICBzdWJDbGFzcy5zdXBlckNsYXNzID0gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG5cbi8vICAgICByZXR1cm4gc3ViQ2xhc3M7XG4vLyB9O1xuIiwiLyoqXG4gKiBAZmlsZSDkuIDloIbpobnnm67ph4zpnaLluLjnlKjnmoTmlrnms5VcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG5leHBvcnRzLnNsaWNlID0gZnVuY3Rpb24gKGFyciwgc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnIsIHN0YXJ0LCBlbmQpO1xufTtcblxuZXhwb3J0cy5nb0RhcmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBub2RlLl9fdGV4dF9fID0gbm9kZS5ub2RlVmFsdWU7XG4gICAgICAgIG5vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgfVxufTtcblxuZXhwb3J0cy5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgaWYgKG5vZGUuX190ZXh0X18gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbm9kZS5ub2RlVmFsdWUgPSBub2RlLl9fdGV4dF9fO1xuICAgICAgICAgICAgbm9kZS5fX3RleHRfXyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmV4cG9ydHMuY3JlYXRlRXhwckZuID0gZnVuY3Rpb24gKGV4cHJSZWdFeHAsIGV4cHIsIGV4cHJDYWxjdWxhdGVyKSB7XG4gICAgZXhwciA9IGV4cHIucmVwbGFjZShleHByUmVnRXhwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBhcmd1bWVudHNbMV07XG4gICAgfSk7XG4gICAgZXhwckNhbGN1bGF0ZXIuY3JlYXRlRXhwckZuKGV4cHIpO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJldHVybiBleHByQ2FsY3VsYXRlci5jYWxjdWxhdGUoZXhwciwgZmFsc2UsIGRhdGEpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIOi2hee6p+eugOWNleeahCBleHRlbmQg77yM5Zug5Li65pys5bqT5a+5IGV4dGVuZCDmsqHpgqPpq5jnmoTopoHmsYLvvIxcbiAqIOetieWIsOacieimgeaxgueahOaXtuWAmeWGjeWujOWWhOOAglxuICpcbiAqIEBpbm5lclxuICogQHBhcmFtICB7T2JqZWN0fSB0YXJnZXQg55uu5qCH5a+56LGhXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICDmnIDnu4jlkIjlubblkI7nmoTlr7nosaFcbiAqL1xuZXhwb3J0cy5leHRlbmQgPSBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gICAgdmFyIHNyY3MgPSBleHBvcnRzLnNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gc3Jjcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIC8qIGVzbGludC1kaXNhYmxlIGd1YXJkLWZvci1pbiAqL1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3Jjc1tpXSkge1xuICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzcmNzW2ldW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgLyogZXNsaW50LWVuYWJsZSBndWFyZC1mb3ItaW4gKi9cbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn07XG5cbmV4cG9ydHMudHJhdmVyc2VOb0NoYW5nZU5vZGVzID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgbm9kZUZuLCBjb250ZXh0KSB7XG4gICAgZm9yICh2YXIgY3VyTm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICAgICAgY3VyTm9kZSAmJiBjdXJOb2RlICE9PSBlbmROb2RlO1xuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZ1xuICAgICkge1xuICAgICAgICBpZiAobm9kZUZuLmNhbGwoY29udGV4dCwgY3VyTm9kZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5vZGVGbi5jYWxsKGNvbnRleHQsIGVuZE5vZGUpO1xufTtcblxuZXhwb3J0cy50cmF2ZXJzZU5vZGVzID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgbm9kZUZuLCBjb250ZXh0KSB7XG4gICAgdmFyIG5vZGVzID0gW107XG4gICAgZm9yICh2YXIgY3VyTm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICAgICAgY3VyTm9kZSAmJiBjdXJOb2RlICE9PSBlbmROb2RlO1xuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZ1xuICAgICkge1xuICAgICAgICBub2Rlcy5wdXNoKGN1ck5vZGUpO1xuICAgIH1cblxuICAgIG5vZGVzLnB1c2goZW5kTm9kZSk7XG5cbiAgICBleHBvcnRzLmVhY2gobm9kZXMsIG5vZGVGbiwgY29udGV4dCk7XG59O1xuXG5leHBvcnRzLmVhY2ggPSBmdW5jdGlvbiAoYXJyLCBmbiwgY29udGV4dCkge1xuICAgIGlmIChleHBvcnRzLmlzQXJyYXkoYXJyKSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBhcnIubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgaWYgKGZuLmNhbGwoY29udGV4dCwgYXJyW2ldLCBpLCBhcnIpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGFyciA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBhcnIpIHtcbiAgICAgICAgICAgIGlmIChmbi5jYWxsKGNvbnRleHQsIGFycltrXSwgaywgYXJyKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0cy5pc0FycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG5cbmV4cG9ydHMuaXNOdW1iZXIgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBOdW1iZXJdJztcbn07XG5cbmV4cG9ydHMuaXNTdWJDbGFzc09mID0gZnVuY3Rpb24gKFN1YkNsYXNzLCBTdXBlckNsYXNzKSB7XG4gICAgcmV0dXJuIFN1YkNsYXNzLnByb3RvdHlwZSBpbnN0YW5jZW9mIFN1cGVyQ2xhc3M7XG59O1xuIiwid2luZG93LkV2ZW50RXhwclBhcnNlciA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi4vc3JjL0V2ZW50RXhwclBhcnNlci5qcycpOyJdfQ==
