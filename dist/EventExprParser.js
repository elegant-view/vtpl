(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var ExprParser = require('./ExprParser');
var inherit = require('./inherit');
var utils = require('./utils');

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

            var me = this;
            this.node['on' + eventName] = function (event) {
                utils.calculateExpression(
                    attr.value.replace(
                        me.config.getExprRegExp(),
                        function () {
                            return arguments[1];
                        }
                    ),
                    utils.extend({}, me.curData, {event: event}),
                    true
                );
            };
        }
    }
    else {
        ExprParser.prototype.addExpr.apply(this, arguments);
    }
};

module.exports = inherit(EventExprParser, ExprParser);


function getEventName(attrName, config) {
    if (attrName.indexOf(config.eventPrefix + '-') === -1) {
        return;
    }

    return attrName.replace(config.eventPrefix + '-', '');
}


},{"./ExprParser":2,"./inherit":4,"./utils":5}],2:[function(require,module,exports){
/**
 * @file 表达式解析器，一个文本节点或者元素节点对应一个表达式解析器实例
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');
var inherit = require('./inherit');
var utils = require('./utils');

function ExprParser(options) {
    Parser.call(this, options);
}

ExprParser.prototype.initialize = function (options) {
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
    }
    // 元素节点
    else if (curNode.nodeType === 1) {
        var attributes = curNode.attributes;
        for (var i = 0, il = attributes.length; i < il; i++) {
            this.addExpr(attributes[i]);
        }
    }
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


module.exports = inherit(ExprParser, Parser);

function createAttrUpdateFn(attr) {
    return function (exprValue) {
        attr.value = exprValue;
    };
}

function addExpr(parser, expr, updateFn) {
    parser.exprs.push(expr);
    if (!parser.exprFns[expr]) {
        parser.exprFns[expr] = createExprFn(parser.config.getExprRegExp(), expr);
    }
    parser.updateFns[expr] = parser.updateFns[expr] || [];
    parser.updateFns[expr].push(updateFn);
}

function createExprFn(exprRegExp, expr) {
    return function (data) {
        return expr.replace(exprRegExp, function () {
            return utils.calculateExpression(arguments[1], data);
        });
    };
}

},{"./Parser":3,"./inherit":4,"./utils":5}],3:[function(require,module,exports){
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
 * @protected
 * @abstract
 * @param {Object} options 来自于构造函数
 */
Parser.prototype.initialize = function (options) {};

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
 * @file 继承
 * @author yibuyisheng(yibuyisheng@163.com)
 */

function inherit(ChildClass, ParentClass) {
    var childProto = ChildClass.prototype;
    ChildClass.prototype = new ParentClass({});
    for (var key in childProto) {
        if (childProto.hasOwnProperty(key)) {
            ChildClass.prototype[key] = childProto[key];
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

},{}],5:[function(require,module,exports){
/**
 * @file 一堆项目里面常用的方法
 * @author yibuyisheng(yibuyisheng@163.com)
 */

exports.slice = function (arr, start, end) {
    return Array.prototype.slice.call(arr, start, end);
};

/**
 * 计算表达式的值
 *
 * @inner
 * @param  {string} expression 表达式字符串，类似于 `${name}` 中的 name
 * @param  {Object} curData    当前表达式对应的数据
 * @param  {boolean} avoidReturn 是否需要返回值，true 代表不需要；false 代表需要
 * @return {string}            计算结果
 */
exports.calculateExpression = function (expression, curData, avoidReturn) {
    var params = getVariableNamesFromExpr(expression);

    var fnArgs = [];
    for (var i = 0, il = params.length; i < il; i++) {
        var param = params[i];
        var value = curData[param];
        fnArgs.push(value === undefined ? '' : value);
    }

    var result;
    try {
        result = (new Function(params, (avoidReturn ? '' : 'return ') + expression)).apply(null, fnArgs);
    }
    catch (e) {
        result = '';
    }

    return result;
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

exports.createExprFn = function (exprRegExp, expr) {
    expr = expr.replace(exprRegExp, function () {
        return arguments[1];
    });

    return function (data) {
        return exports.calculateExpression(expr, data);
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
    return Object.prototype.toString.call(arr) === 'object Array';
};

/**
 * 从表达式中抽离出变量名
 *
 * @inner
 * @param  {string} expr 表达式字符串，类似于 `${name}` 中的 name
 * @return {Array.<string>}      变量名数组
 */
var exprNameMap = {};
var exprNameRegExp = /\.?\$?([a-z|A-Z]+|([a-z|A-Z]+[0-9]+[a-z|A-Z]*))/g;
function getVariableNamesFromExpr(expr) {
    if (exprNameMap[expr]) {
        return exprNameMap[expr];
    }

    var matches = expr.match(exprNameRegExp) || [];
    var names = {};
    for (var i = 0, il = matches.length; i < il; i++) {
        if (matches[i] && matches[i][0] !== '.') {
            names[matches[i]] = true;
        }
    }

    var ret = [];
    exports.each(names, function (isOk, name) {
        if (isOk) {
            ret.push(name);
        }
    });
    exprNameMap[expr] = ret;

    return ret;
}

},{}],6:[function(require,module,exports){
window.EventExprParser = module.exports = require('../src/EventExprParser.js');
},{"../src/EventExprParser.js":1}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9FdmVudEV4cHJQYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvRXhwclBhcnNlci5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9QYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvaW5oZXJpdC5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3RtcC9mYWtlXzgwZmU5NjBiLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0tBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBFeHByUGFyc2VyID0gcmVxdWlyZSgnLi9FeHByUGFyc2VyJyk7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJy4vaW5oZXJpdCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBFdmVudEV4cHJQYXJzZXIob3B0aW9ucykge1xuICAgIEV4cHJQYXJzZXIuY2FsbCh0aGlzLCBvcHRpb25zKTtcbn1cblxuRXZlbnRFeHByUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBFeHByUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICB0aGlzLmV2ZW50cyA9IHt9O1xufTtcblxuRXZlbnRFeHByUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBFeHByUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICB0aGlzLmN1ckRhdGEgPSBkYXRhO1xufTtcblxuRXZlbnRFeHByUGFyc2VyLnByb3RvdHlwZS5hZGRFeHByID0gZnVuY3Rpb24gKGF0dHIpIHtcbiAgICBpZiAoIWF0dHIpIHtcbiAgICAgICAgcmV0dXJuIEV4cHJQYXJzZXIucHJvdG90eXBlLmFkZEV4cHIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICB2YXIgZXZlbnROYW1lID0gZ2V0RXZlbnROYW1lKGF0dHIubmFtZSwgdGhpcy5jb25maWcpO1xuICAgIGlmIChldmVudE5hbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmdldEV4cHJSZWdFeHAoKS50ZXN0KGF0dHIudmFsdWUpKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50c1tldmVudE5hbWVdID0gYXR0ci52YWx1ZTtcblxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMubm9kZVsnb24nICsgZXZlbnROYW1lXSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIHV0aWxzLmNhbGN1bGF0ZUV4cHJlc3Npb24oXG4gICAgICAgICAgICAgICAgICAgIGF0dHIudmFsdWUucmVwbGFjZShcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lLmNvbmZpZy5nZXRFeHByUmVnRXhwKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1sxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICAgICAgdXRpbHMuZXh0ZW5kKHt9LCBtZS5jdXJEYXRhLCB7ZXZlbnQ6IGV2ZW50fSksXG4gICAgICAgICAgICAgICAgICAgIHRydWVcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgRXhwclBhcnNlci5wcm90b3R5cGUuYWRkRXhwci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gaW5oZXJpdChFdmVudEV4cHJQYXJzZXIsIEV4cHJQYXJzZXIpO1xuXG5cbmZ1bmN0aW9uIGdldEV2ZW50TmFtZShhdHRyTmFtZSwgY29uZmlnKSB7XG4gICAgaWYgKGF0dHJOYW1lLmluZGV4T2YoY29uZmlnLmV2ZW50UHJlZml4ICsgJy0nKSA9PT0gLTEpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHJldHVybiBhdHRyTmFtZS5yZXBsYWNlKGNvbmZpZy5ldmVudFByZWZpeCArICctJywgJycpO1xufVxuXG4iLCIvKipcbiAqIEBmaWxlIOihqOi+vuW8j+ino+aekOWZqO+8jOS4gOS4quaWh+acrOiKgueCueaIluiAheWFg+e0oOiKgueCueWvueW6lOS4gOS4quihqOi+vuW8j+ino+aekOWZqOWunuS+i1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbnZhciBQYXJzZXIgPSByZXF1aXJlKCcuL1BhcnNlcicpO1xudmFyIGluaGVyaXQgPSByZXF1aXJlKCcuL2luaGVyaXQnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuZnVuY3Rpb24gRXhwclBhcnNlcihvcHRpb25zKSB7XG4gICAgUGFyc2VyLmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG5cbkV4cHJQYXJzZXIucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHRoaXMubm9kZSA9IG9wdGlvbnMubm9kZTtcbiAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xuXG4gICAgdGhpcy5leHBycyA9IFtdO1xuICAgIHRoaXMuZXhwckZucyA9IHt9O1xuICAgIHRoaXMudXBkYXRlRm5zID0ge307XG4gICAgdGhpcy5leHByT2xkVmFsdWVzID0ge307XG59O1xuXG4vKipcbiAqIOaQnOmbhui/h+eoi1xuICpcbiAqIEBwdWJsaWNcbiAqL1xuRXhwclBhcnNlci5wcm90b3R5cGUuY29sbGVjdEV4cHJzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJOb2RlID0gdGhpcy5ub2RlO1xuXG4gICAgLy8g5paH5pys6IqC54K5XG4gICAgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgdGhpcy5hZGRFeHByKCk7XG4gICAgfVxuICAgIC8vIOWFg+e0oOiKgueCuVxuICAgIGVsc2UgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBjdXJOb2RlLmF0dHJpYnV0ZXM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGF0dHJpYnV0ZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5hZGRFeHByKGF0dHJpYnV0ZXNbaV0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiDmt7vliqDooajovr7lvI9cbiAqXG4gKiBAcHJvdGVjdGVkXG4gKiBAcGFyYW0ge0F0dHJ9IGF0dHIg5aaC5p6c5b2T5YmN5piv5YWD57Sg6IqC54K577yM5YiZ6KaB5Lyg5YWl6YGN5Y6G5Yiw55qE5bGe5oCnXG4gKi9cbkV4cHJQYXJzZXIucHJvdG90eXBlLmFkZEV4cHIgPSBmdW5jdGlvbiAoYXR0cikge1xuICAgIHZhciBleHByID0gYXR0ciA/IGF0dHIudmFsdWUgOiB0aGlzLm5vZGUubm9kZVZhbHVlO1xuICAgIGlmICghdGhpcy5jb25maWcuZ2V0RXhwclJlZ0V4cCgpLnRlc3QoZXhwcikpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhZGRFeHByKFxuICAgICAgICB0aGlzLFxuICAgICAgICBleHByLFxuICAgICAgICBhdHRyID8gY3JlYXRlQXR0clVwZGF0ZUZuKGF0dHIpIDogKGZ1bmN0aW9uIChjdXJOb2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGV4cHJWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGN1ck5vZGUubm9kZVZhbHVlID0gZXhwclZhbHVlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSkodGhpcy5ub2RlKVxuICAgICk7XG59O1xuXG4vKipcbiAqIOiuvue9ruaVsOaNrui/h+eoi1xuICpcbiAqIEBwdWJsaWNcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIOaVsOaNrlxuICovXG5FeHByUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgZXhwcnMgPSB0aGlzLmV4cHJzO1xuICAgIHZhciBleHByT2xkVmFsdWVzID0gdGhpcy5leHByT2xkVmFsdWVzO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGV4cHJzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgdmFyIGV4cHIgPSBleHByc1tpXTtcbiAgICAgICAgdmFyIGV4cHJWYWx1ZSA9IHRoaXMuZXhwckZuc1tleHByXShkYXRhKTtcblxuICAgICAgICBpZiAodGhpcy5kaXJ0eUNoZWNrKGV4cHIsIGV4cHJWYWx1ZSwgZXhwck9sZFZhbHVlc1tleHByXSkpIHtcbiAgICAgICAgICAgIHZhciB1cGRhdGVGbnMgPSB0aGlzLnVwZGF0ZUZuc1tleHByXTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwLCBqbCA9IHVwZGF0ZUZucy5sZW5ndGg7IGogPCBqbDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlRm5zW2pdKGV4cHJWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHByT2xkVmFsdWVzW2V4cHJdID0gZXhwclZhbHVlO1xuICAgIH1cbn07XG5cbi8qKlxuICog6IqC54K54oCc6ZqQ6JeP4oCd6LW35p2lXG4gKlxuICogQHB1YmxpY1xuICovXG5FeHByUGFyc2VyLnByb3RvdHlwZS5nb0RhcmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgdXRpbHMuZ29EYXJrKHRoaXMubm9kZSk7XG59O1xuXG4vKipcbiAqIOiKgueCueKAnOaYvuekuuKAneWHuuadpVxuICpcbiAqIEBwdWJsaWNcbiAqL1xuRXhwclBhcnNlci5wcm90b3R5cGUucmVzdG9yZUZyb21EYXJrID0gZnVuY3Rpb24gKCkge1xuICAgIHV0aWxzLnJlc3RvcmVGcm9tRGFyayh0aGlzLm5vZGUpO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGluaGVyaXQoRXhwclBhcnNlciwgUGFyc2VyKTtcblxuZnVuY3Rpb24gY3JlYXRlQXR0clVwZGF0ZUZuKGF0dHIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGV4cHJWYWx1ZSkge1xuICAgICAgICBhdHRyLnZhbHVlID0gZXhwclZhbHVlO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGFkZEV4cHIocGFyc2VyLCBleHByLCB1cGRhdGVGbikge1xuICAgIHBhcnNlci5leHBycy5wdXNoKGV4cHIpO1xuICAgIGlmICghcGFyc2VyLmV4cHJGbnNbZXhwcl0pIHtcbiAgICAgICAgcGFyc2VyLmV4cHJGbnNbZXhwcl0gPSBjcmVhdGVFeHByRm4ocGFyc2VyLmNvbmZpZy5nZXRFeHByUmVnRXhwKCksIGV4cHIpO1xuICAgIH1cbiAgICBwYXJzZXIudXBkYXRlRm5zW2V4cHJdID0gcGFyc2VyLnVwZGF0ZUZuc1tleHByXSB8fCBbXTtcbiAgICBwYXJzZXIudXBkYXRlRm5zW2V4cHJdLnB1c2godXBkYXRlRm4pO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFeHByRm4oZXhwclJlZ0V4cCwgZXhwcikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICByZXR1cm4gZXhwci5yZXBsYWNlKGV4cHJSZWdFeHAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB1dGlscy5jYWxjdWxhdGVFeHByZXNzaW9uKGFyZ3VtZW50c1sxXSwgZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG4iLCIvKipcbiAqIEBmaWxlIOino+aekOWZqOeahOaKveixoeWfuuexu1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbi8qKlxuICog5p6E6YCg5Ye95pWwXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDphY3nva7lj4LmlbDvvIzkuIDoiKzlj6/og73kvJrmnInlpoLkuIvlhoXlrrnvvJpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydE5vZGU6IC4uLixcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmROb2RlOiAuLi4sXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogLi4uLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZzogLi4uXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICDlhbfkvZPmmK/llaXlj6/ku6Xlj4LliqDlhbfkvZPnmoTlrZDnsbtcbiAqL1xuZnVuY3Rpb24gUGFyc2VyKG9wdGlvbnMpIHtcbiAgICB0aGlzLmluaXRpYWxpemUob3B0aW9ucyk7XG59XG5cbi8qKlxuICog5Yid5aeL5YyWXG4gKlxuICogQHByb3RlY3RlZFxuICogQGFic3RyYWN0XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDmnaXoh6rkuo7mnoTpgKDlh73mlbBcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHt9O1xuXG4vKipcbiAqIOmUgOavgeino+aekOWZqFxuICpcbiAqIEBwdWJsaWNcbiAqIEBhYnN0cmFjdFxuICovXG5QYXJzZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDorr7nva7mlbDmja5cbiAqXG4gKiBAcHVibGljXG4gKiBAYWJzdHJhY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIOimgeiuvue9rueahOaVsOaNrlxuICovXG5QYXJzZXIucHJvdG90eXBlLnNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge307XG5cbi8qKlxuICog6ZqQ6JeP55u45YWz5YWD57SgXG4gKlxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vKipcbiAqIOaYvuekuuebuOWFs+WFg+e0oFxuICpcbiAqIEBwdWJsaWNcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDmkJzpm4booajovr7lvI/vvIznlJ/miJDooajovr7lvI/lh73mlbDlkowgRE9NIOabtOaWsOWHveaVsFxuICpcbiAqIEBhYnN0cmFjdFxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHt9O1xuXG5QYXJzZXIucHJvdG90eXBlLmRpcnR5Q2hlY2sgPSBmdW5jdGlvbiAoZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWUpIHtcbiAgICB2YXIgZGlydHlDaGVja2VyRm4gPSB0aGlzLmRpcnR5Q2hlY2tlciA/IHRoaXMuZGlydHlDaGVja2VyLmdldENoZWNrZXIoZXhwcikgOiBudWxsO1xuICAgIHJldHVybiAoZGlydHlDaGVja2VyRm4gJiYgZGlydHlDaGVja2VyRm4oZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWUpKVxuICAgICAgICAgICAgfHwgKCFkaXJ0eUNoZWNrZXJGbiAmJiBleHByVmFsdWUgIT09IGV4cHJPbGRWYWx1ZSk7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLnNldERpcnR5Q2hlY2tlciA9IGZ1bmN0aW9uIChkaXJ0eUNoZWNrZXIpIHtcbiAgICB0aGlzLmRpcnR5Q2hlY2tlciA9IGRpcnR5Q2hlY2tlcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGFyc2VyO1xuIiwiLyoqXG4gKiBAZmlsZSDnu6fmib9cbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG5mdW5jdGlvbiBpbmhlcml0KENoaWxkQ2xhc3MsIFBhcmVudENsYXNzKSB7XG4gICAgdmFyIGNoaWxkUHJvdG8gPSBDaGlsZENsYXNzLnByb3RvdHlwZTtcbiAgICBDaGlsZENsYXNzLnByb3RvdHlwZSA9IG5ldyBQYXJlbnRDbGFzcyh7fSk7XG4gICAgZm9yICh2YXIga2V5IGluIGNoaWxkUHJvdG8pIHtcbiAgICAgICAgaWYgKGNoaWxkUHJvdG8uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgQ2hpbGRDbGFzcy5wcm90b3R5cGVba2V5XSA9IGNoaWxkUHJvdG9ba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gQ2hpbGRDbGFzcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0O1xuXG4vLyBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdWJDbGFzcywgc3VwZXJDbGFzcykge1xuLy8gICAgIHZhciBFbXB0eSA9IGZ1bmN0aW9uICgpIHt9O1xuLy8gICAgIEVtcHR5LnByb3RvdHlwZSA9IHN1cGVyQ2xhc3MucHJvdG90eXBlO1xuLy8gICAgIHZhciBzZWxmUHJvdG90eXBlID0gc3ViQ2xhc3MucHJvdG90eXBlO1xuLy8gICAgIHZhciBwcm90byA9IHN1YkNsYXNzLnByb3RvdHlwZSA9IG5ldyBFbXB0eSgpO1xuXG4vLyAgICAgZm9yICh2YXIga2V5IGluIHNlbGZQcm90b3R5cGUpIHtcbi8vICAgICAgICAgcHJvdG9ba2V5XSA9IHNlbGZQcm90b3R5cGVba2V5XTtcbi8vICAgICB9XG4vLyAgICAgc3ViQ2xhc3MucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gc3ViQ2xhc3M7XG4vLyAgICAgc3ViQ2xhc3Muc3VwZXJDbGFzcyA9IHN1cGVyQ2xhc3MucHJvdG90eXBlO1xuXG4vLyAgICAgcmV0dXJuIHN1YkNsYXNzO1xuLy8gfTtcbiIsIi8qKlxuICogQGZpbGUg5LiA5aCG6aG555uu6YeM6Z2i5bi455So55qE5pa55rOVXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxuZXhwb3J0cy5zbGljZSA9IGZ1bmN0aW9uIChhcnIsIHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyLCBzdGFydCwgZW5kKTtcbn07XG5cbi8qKlxuICog6K6h566X6KGo6L6+5byP55qE5YC8XG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV4cHJlc3Npb24g6KGo6L6+5byP5a2X56ym5Liy77yM57G75Ly85LqOIGAke25hbWV9YCDkuK3nmoQgbmFtZVxuICogQHBhcmFtICB7T2JqZWN0fSBjdXJEYXRhICAgIOW9k+WJjeihqOi+vuW8j+WvueW6lOeahOaVsOaNrlxuICogQHBhcmFtICB7Ym9vbGVhbn0gYXZvaWRSZXR1cm4g5piv5ZCm6ZyA6KaB6L+U5Zue5YC877yMdHJ1ZSDku6PooajkuI3pnIDopoHvvJtmYWxzZSDku6PooajpnIDopoFcbiAqIEByZXR1cm4ge3N0cmluZ30gICAgICAgICAgICDorqHnrpfnu5PmnpxcbiAqL1xuZXhwb3J0cy5jYWxjdWxhdGVFeHByZXNzaW9uID0gZnVuY3Rpb24gKGV4cHJlc3Npb24sIGN1ckRhdGEsIGF2b2lkUmV0dXJuKSB7XG4gICAgdmFyIHBhcmFtcyA9IGdldFZhcmlhYmxlTmFtZXNGcm9tRXhwcihleHByZXNzaW9uKTtcblxuICAgIHZhciBmbkFyZ3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBwYXJhbXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICB2YXIgcGFyYW0gPSBwYXJhbXNbaV07XG4gICAgICAgIHZhciB2YWx1ZSA9IGN1ckRhdGFbcGFyYW1dO1xuICAgICAgICBmbkFyZ3MucHVzaCh2YWx1ZSA9PT0gdW5kZWZpbmVkID8gJycgOiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdDtcbiAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSAobmV3IEZ1bmN0aW9uKHBhcmFtcywgKGF2b2lkUmV0dXJuID8gJycgOiAncmV0dXJuICcpICsgZXhwcmVzc2lvbikpLmFwcGx5KG51bGwsIGZuQXJncyk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIHJlc3VsdCA9ICcnO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5leHBvcnRzLmdvRGFyayA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgbm9kZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIH1cbiAgICBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIG5vZGUuX190ZXh0X18gPSBub2RlLm5vZGVWYWx1ZTtcbiAgICAgICAgbm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICB9XG59O1xuXG5leHBvcnRzLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgbm9kZS5zdHlsZS5kaXNwbGF5ID0gbnVsbDtcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBpZiAobm9kZS5fX3RleHRfXyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBub2RlLm5vZGVWYWx1ZSA9IG5vZGUuX190ZXh0X187XG4gICAgICAgICAgICBub2RlLl9fdGV4dF9fID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0cy5jcmVhdGVFeHByRm4gPSBmdW5jdGlvbiAoZXhwclJlZ0V4cCwgZXhwcikge1xuICAgIGV4cHIgPSBleHByLnJlcGxhY2UoZXhwclJlZ0V4cCwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gYXJndW1lbnRzWzFdO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJldHVybiBleHBvcnRzLmNhbGN1bGF0ZUV4cHJlc3Npb24oZXhwciwgZGF0YSk7XG4gICAgfTtcbn07XG5cbi8qKlxuICog6LaF57qn566A5Y2V55qEIGV4dGVuZCDvvIzlm6DkuLrmnKzlupPlr7kgZXh0ZW5kIOayoemCo+mrmOeahOimgeaxgu+8jFxuICog562J5Yiw5pyJ6KaB5rGC55qE5pe25YCZ5YaN5a6M5ZaE44CCXG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0gIHtPYmplY3R9IHRhcmdldCDnm67moIflr7nosaFcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgIOacgOe7iOWQiOW5tuWQjueahOWvueixoVxuICovXG5leHBvcnRzLmV4dGVuZCA9IGZ1bmN0aW9uICh0YXJnZXQpIHtcbiAgICB2YXIgc3JjcyA9IGV4cG9ydHMuc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBzcmNzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgLyogZXNsaW50LWRpc2FibGUgZ3VhcmQtZm9yLWluICovXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzcmNzW2ldKSB7XG4gICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNyY3NbaV1ba2V5XTtcbiAgICAgICAgfVxuICAgICAgICAvKiBlc2xpbnQtZW5hYmxlIGd1YXJkLWZvci1pbiAqL1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufTtcblxuZXhwb3J0cy50cmF2ZXJzZU5vQ2hhbmdlTm9kZXMgPSBmdW5jdGlvbiAoc3RhcnROb2RlLCBlbmROb2RlLCBub2RlRm4sIGNvbnRleHQpIHtcbiAgICBmb3IgKHZhciBjdXJOb2RlID0gc3RhcnROb2RlO1xuICAgICAgICBjdXJOb2RlICYmIGN1ck5vZGUgIT09IGVuZE5vZGU7XG4gICAgICAgIGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nXG4gICAgKSB7XG4gICAgICAgIGlmIChub2RlRm4uY2FsbChjb250ZXh0LCBjdXJOb2RlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbm9kZUZuLmNhbGwoY29udGV4dCwgZW5kTm9kZSk7XG59O1xuXG5leHBvcnRzLnRyYXZlcnNlTm9kZXMgPSBmdW5jdGlvbiAoc3RhcnROb2RlLCBlbmROb2RlLCBub2RlRm4sIGNvbnRleHQpIHtcbiAgICB2YXIgbm9kZXMgPSBbXTtcbiAgICBmb3IgKHZhciBjdXJOb2RlID0gc3RhcnROb2RlO1xuICAgICAgICBjdXJOb2RlICYmIGN1ck5vZGUgIT09IGVuZE5vZGU7XG4gICAgICAgIGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nXG4gICAgKSB7XG4gICAgICAgIG5vZGVzLnB1c2goY3VyTm9kZSk7XG4gICAgfVxuXG4gICAgbm9kZXMucHVzaChlbmROb2RlKTtcblxuICAgIGV4cG9ydHMuZWFjaChub2Rlcywgbm9kZUZuLCBjb250ZXh0KTtcbn07XG5cbmV4cG9ydHMuZWFjaCA9IGZ1bmN0aW9uIChhcnIsIGZuLCBjb250ZXh0KSB7XG4gICAgaWYgKGV4cG9ydHMuaXNBcnJheShhcnIpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGFyci5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZm4uY2FsbChjb250ZXh0LCBhcnJbaV0sIGksIGFycikpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgYXJyID09PSAnb2JqZWN0Jykge1xuICAgICAgICBmb3IgKHZhciBrIGluIGFycikge1xuICAgICAgICAgICAgaWYgKGZuLmNhbGwoY29udGV4dCwgYXJyW2tdLCBrLCBhcnIpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5leHBvcnRzLmlzQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09PSAnb2JqZWN0IEFycmF5Jztcbn07XG5cbi8qKlxuICog5LuO6KGo6L6+5byP5Lit5oq956a75Ye65Y+Y6YeP5ZCNXG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV4cHIg6KGo6L6+5byP5a2X56ym5Liy77yM57G75Ly85LqOIGAke25hbWV9YCDkuK3nmoQgbmFtZVxuICogQHJldHVybiB7QXJyYXkuPHN0cmluZz59ICAgICAg5Y+Y6YeP5ZCN5pWw57uEXG4gKi9cbnZhciBleHByTmFtZU1hcCA9IHt9O1xudmFyIGV4cHJOYW1lUmVnRXhwID0gL1xcLj9cXCQ/KFthLXp8QS1aXSt8KFthLXp8QS1aXStbMC05XStbYS16fEEtWl0qKSkvZztcbmZ1bmN0aW9uIGdldFZhcmlhYmxlTmFtZXNGcm9tRXhwcihleHByKSB7XG4gICAgaWYgKGV4cHJOYW1lTWFwW2V4cHJdKSB7XG4gICAgICAgIHJldHVybiBleHByTmFtZU1hcFtleHByXTtcbiAgICB9XG5cbiAgICB2YXIgbWF0Y2hlcyA9IGV4cHIubWF0Y2goZXhwck5hbWVSZWdFeHApIHx8IFtdO1xuICAgIHZhciBuYW1lcyA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IG1hdGNoZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICBpZiAobWF0Y2hlc1tpXSAmJiBtYXRjaGVzW2ldWzBdICE9PSAnLicpIHtcbiAgICAgICAgICAgIG5hbWVzW21hdGNoZXNbaV1dID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciByZXQgPSBbXTtcbiAgICBleHBvcnRzLmVhY2gobmFtZXMsIGZ1bmN0aW9uIChpc09rLCBuYW1lKSB7XG4gICAgICAgIGlmIChpc09rKSB7XG4gICAgICAgICAgICByZXQucHVzaChuYW1lKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGV4cHJOYW1lTWFwW2V4cHJdID0gcmV0O1xuXG4gICAgcmV0dXJuIHJldDtcbn1cbiIsIndpbmRvdy5FdmVudEV4cHJQYXJzZXIgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4uL3NyYy9FdmVudEV4cHJQYXJzZXIuanMnKTsiXX0=
