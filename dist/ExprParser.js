(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./Parser":2,"./inherit":3,"./utils":4}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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
 * @return {string}            计算结果
 */
exports.calculateExpression = function (expression, curData) {
    var params = getVariableNamesFromExpr(expression);

    var fnArgs = [];
    for (var i = 0, il = params.length; i < il; i++) {
        var param = params[i];
        var value = curData[param];
        fnArgs.push(value === undefined ? '' : value);
    }

    var result;
    try {
        result = (new Function(params, 'return ' + expression)).apply(null, fnArgs);
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
    var names = [];
    for (var i = 0, il = matches.length; i < il; i++) {
        if (matches[i] && matches[i][0] !== '.') {
            names.push(matches[i]);
        }
    }

    exprNameMap[expr] = names;

    return names;
}

},{}],5:[function(require,module,exports){
window.ExprParser = module.exports = require('../src/ExprParser.js');
},{"../src/ExprParser.js":1}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9FeHByUGFyc2VyLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL1BhcnNlci5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9pbmhlcml0LmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL3V0aWxzLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvdG1wL2Zha2VfMTkwYmE2MzYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQGZpbGUg6KGo6L6+5byP6Kej5p6Q5Zmo77yM5LiA5Liq5paH5pys6IqC54K55oiW6ICF5YWD57Sg6IqC54K55a+55bqU5LiA5Liq6KGo6L6+5byP6Kej5p6Q5Zmo5a6e5L6LXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxudmFyIFBhcnNlciA9IHJlcXVpcmUoJy4vUGFyc2VyJyk7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJy4vaW5oZXJpdCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBFeHByUGFyc2VyKG9wdGlvbnMpIHtcbiAgICBQYXJzZXIuY2FsbCh0aGlzLCBvcHRpb25zKTtcbn1cblxuRXhwclBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdGhpcy5ub2RlID0gb3B0aW9ucy5ub2RlO1xuICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG5cbiAgICB0aGlzLmV4cHJzID0gW107XG4gICAgdGhpcy5leHByRm5zID0ge307XG4gICAgdGhpcy51cGRhdGVGbnMgPSB7fTtcbiAgICB0aGlzLmV4cHJPbGRWYWx1ZXMgPSB7fTtcbn07XG5cbi8qKlxuICog5pCc6ZuG6L+H56iLXG4gKlxuICogQHB1YmxpY1xuICovXG5FeHByUGFyc2VyLnByb3RvdHlwZS5jb2xsZWN0RXhwcnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1ck5vZGUgPSB0aGlzLm5vZGU7XG5cbiAgICAvLyDmlofmnKzoioLngrlcbiAgICBpZiAoY3VyTm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICB0aGlzLmFkZEV4cHIoKTtcbiAgICB9XG4gICAgLy8g5YWD57Sg6IqC54K5XG4gICAgZWxzZSBpZiAoY3VyTm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICB2YXIgYXR0cmlidXRlcyA9IGN1ck5vZGUuYXR0cmlidXRlcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlsID0gYXR0cmlidXRlcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmFkZEV4cHIoYXR0cmlidXRlc1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIOa3u+WKoOihqOi+vuW8j1xuICpcbiAqIEBwcm90ZWN0ZWRcbiAqIEBwYXJhbSB7QXR0cn0gYXR0ciDlpoLmnpzlvZPliY3mmK/lhYPntKDoioLngrnvvIzliJnopoHkvKDlhaXpgY3ljobliLDnmoTlsZ7mgKdcbiAqL1xuRXhwclBhcnNlci5wcm90b3R5cGUuYWRkRXhwciA9IGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgdmFyIGV4cHIgPSBhdHRyID8gYXR0ci52YWx1ZSA6IHRoaXMubm9kZS5ub2RlVmFsdWU7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5nZXRFeHByUmVnRXhwKCkudGVzdChleHByKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGFkZEV4cHIoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIGV4cHIsXG4gICAgICAgIGF0dHIgPyBjcmVhdGVBdHRyVXBkYXRlRm4oYXR0cikgOiAoZnVuY3Rpb24gKGN1ck5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXhwclZhbHVlKSB7XG4gICAgICAgICAgICAgICAgY3VyTm9kZS5ub2RlVmFsdWUgPSBleHByVmFsdWU7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KSh0aGlzLm5vZGUpXG4gICAgKTtcbn07XG5cbi8qKlxuICog6K6+572u5pWw5o2u6L+H56iLXG4gKlxuICogQHB1YmxpY1xuICogQHBhcmFtIHtPYmplY3R9IGRhdGEg5pWw5o2uXG4gKi9cbkV4cHJQYXJzZXIucHJvdG90eXBlLnNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBleHBycyA9IHRoaXMuZXhwcnM7XG4gICAgdmFyIGV4cHJPbGRWYWx1ZXMgPSB0aGlzLmV4cHJPbGRWYWx1ZXM7XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gZXhwcnMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICB2YXIgZXhwciA9IGV4cHJzW2ldO1xuICAgICAgICB2YXIgZXhwclZhbHVlID0gdGhpcy5leHByRm5zW2V4cHJdKGRhdGEpO1xuXG4gICAgICAgIGlmICh0aGlzLmRpcnR5Q2hlY2soZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWVzW2V4cHJdKSkge1xuICAgICAgICAgICAgdmFyIHVwZGF0ZUZucyA9IHRoaXMudXBkYXRlRm5zW2V4cHJdO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDAsIGpsID0gdXBkYXRlRm5zLmxlbmd0aDsgaiA8IGpsOyBqKyspIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVGbnNbal0oZXhwclZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cHJPbGRWYWx1ZXNbZXhwcl0gPSBleHByVmFsdWU7XG4gICAgfVxufTtcblxuLyoqXG4gKiDoioLngrnigJzpmpDol4/igJ3otbfmnaVcbiAqXG4gKiBAcHVibGljXG4gKi9cbkV4cHJQYXJzZXIucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy5nb0RhcmsodGhpcy5ub2RlKTtcbn07XG5cbi8qKlxuICog6IqC54K54oCc5pi+56S64oCd5Ye65p2lXG4gKlxuICogQHB1YmxpY1xuICovXG5FeHByUGFyc2VyLnByb3RvdHlwZS5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgdXRpbHMucmVzdG9yZUZyb21EYXJrKHRoaXMubm9kZSk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gaW5oZXJpdChFeHByUGFyc2VyLCBQYXJzZXIpO1xuXG5mdW5jdGlvbiBjcmVhdGVBdHRyVXBkYXRlRm4oYXR0cikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZXhwclZhbHVlKSB7XG4gICAgICAgIGF0dHIudmFsdWUgPSBleHByVmFsdWU7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gYWRkRXhwcihwYXJzZXIsIGV4cHIsIHVwZGF0ZUZuKSB7XG4gICAgcGFyc2VyLmV4cHJzLnB1c2goZXhwcik7XG4gICAgaWYgKCFwYXJzZXIuZXhwckZuc1tleHByXSkge1xuICAgICAgICBwYXJzZXIuZXhwckZuc1tleHByXSA9IGNyZWF0ZUV4cHJGbihwYXJzZXIuY29uZmlnLmdldEV4cHJSZWdFeHAoKSwgZXhwcik7XG4gICAgfVxuICAgIHBhcnNlci51cGRhdGVGbnNbZXhwcl0gPSBwYXJzZXIudXBkYXRlRm5zW2V4cHJdIHx8IFtdO1xuICAgIHBhcnNlci51cGRhdGVGbnNbZXhwcl0ucHVzaCh1cGRhdGVGbik7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUV4cHJGbihleHByUmVnRXhwLCBleHByKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJldHVybiBleHByLnJlcGxhY2UoZXhwclJlZ0V4cCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHV0aWxzLmNhbGN1bGF0ZUV4cHJlc3Npb24oYXJndW1lbnRzWzFdLCBkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbn1cbiIsIi8qKlxuICogQGZpbGUg6Kej5p6Q5Zmo55qE5oq96LGh5Z+657G7XG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxuLyoqXG4gKiDmnoTpgKDlh73mlbBcbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIOmFjee9ruWPguaVsO+8jOS4gOiIrOWPr+iDveS8muacieWmguS4i+WGheWuue+8mlxuICogICAgICAgICAgICAgICAgICAgICAgICAge1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0Tm9kZTogLi4uLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZE5vZGU6IC4uLixcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlOiAuLi4sXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnOiAuLi5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAqICAgICAgICAgICAgICAgICAgICAgICAgIOWFt+S9k+aYr+WVpeWPr+S7peWPguWKoOWFt+S9k+eahOWtkOexu1xuICovXG5mdW5jdGlvbiBQYXJzZXIob3B0aW9ucykge1xuICAgIHRoaXMuaW5pdGlhbGl6ZShvcHRpb25zKTtcbn1cblxuLyoqXG4gKiDliJ3lp4vljJZcbiAqXG4gKiBAcHJvdGVjdGVkXG4gKiBAYWJzdHJhY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIOadpeiHquS6juaehOmAoOWHveaVsFxuICovXG5QYXJzZXIucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiAob3B0aW9ucykge307XG5cbi8qKlxuICog6ZSA5q+B6Kej5p6Q5ZmoXG4gKlxuICogQHB1YmxpY1xuICogQGFic3RyYWN0XG4gKi9cblBhcnNlci5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vKipcbiAqIOiuvue9ruaVsOaNrlxuICpcbiAqIEBwdWJsaWNcbiAqIEBhYnN0cmFjdFxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEg6KaB6K6+572u55qE5pWw5o2uXG4gKi9cblBhcnNlci5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7fTtcblxuLyoqXG4gKiDpmpDol4/nm7jlhbPlhYPntKBcbiAqXG4gKiBAcHVibGljXG4gKi9cblBhcnNlci5wcm90b3R5cGUuZ29EYXJrID0gZnVuY3Rpb24gKCkge307XG5cbi8qKlxuICog5pi+56S655u45YWz5YWD57SgXG4gKlxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vKipcbiAqIOaQnOmbhuihqOi+vuW8j++8jOeUn+aIkOihqOi+vuW8j+WHveaVsOWSjCBET00g5pu05paw5Ye95pWwXG4gKlxuICogQGFic3RyYWN0XG4gKiBAcHVibGljXG4gKi9cblBhcnNlci5wcm90b3R5cGUuY29sbGVjdEV4cHJzID0gZnVuY3Rpb24gKCkge307XG5cblBhcnNlci5wcm90b3R5cGUuZGlydHlDaGVjayA9IGZ1bmN0aW9uIChleHByLCBleHByVmFsdWUsIGV4cHJPbGRWYWx1ZSkge1xuICAgIHZhciBkaXJ0eUNoZWNrZXJGbiA9IHRoaXMuZGlydHlDaGVja2VyID8gdGhpcy5kaXJ0eUNoZWNrZXIuZ2V0Q2hlY2tlcihleHByKSA6IG51bGw7XG4gICAgcmV0dXJuIChkaXJ0eUNoZWNrZXJGbiAmJiBkaXJ0eUNoZWNrZXJGbihleHByLCBleHByVmFsdWUsIGV4cHJPbGRWYWx1ZSkpXG4gICAgICAgICAgICB8fCAoIWRpcnR5Q2hlY2tlckZuICYmIGV4cHJWYWx1ZSAhPT0gZXhwck9sZFZhbHVlKTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUuc2V0RGlydHlDaGVja2VyID0gZnVuY3Rpb24gKGRpcnR5Q2hlY2tlcikge1xuICAgIHRoaXMuZGlydHlDaGVja2VyID0gZGlydHlDaGVja2VyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYXJzZXI7XG4iLCIvKipcbiAqIEBmaWxlIOe7p+aJv1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbmZ1bmN0aW9uIGluaGVyaXQoQ2hpbGRDbGFzcywgUGFyZW50Q2xhc3MpIHtcbiAgICB2YXIgY2hpbGRQcm90byA9IENoaWxkQ2xhc3MucHJvdG90eXBlO1xuICAgIENoaWxkQ2xhc3MucHJvdG90eXBlID0gbmV3IFBhcmVudENsYXNzKHt9KTtcbiAgICBmb3IgKHZhciBrZXkgaW4gY2hpbGRQcm90bykge1xuICAgICAgICBpZiAoY2hpbGRQcm90by5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBDaGlsZENsYXNzLnByb3RvdHlwZVtrZXldID0gY2hpbGRQcm90b1trZXldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBDaGlsZENsYXNzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluaGVyaXQ7XG5cbi8vIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7XG4vLyAgICAgdmFyIEVtcHR5ID0gZnVuY3Rpb24gKCkge307XG4vLyAgICAgRW1wdHkucHJvdG90eXBlID0gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG4vLyAgICAgdmFyIHNlbGZQcm90b3R5cGUgPSBzdWJDbGFzcy5wcm90b3R5cGU7XG4vLyAgICAgdmFyIHByb3RvID0gc3ViQ2xhc3MucHJvdG90eXBlID0gbmV3IEVtcHR5KCk7XG5cbi8vICAgICBmb3IgKHZhciBrZXkgaW4gc2VsZlByb3RvdHlwZSkge1xuLy8gICAgICAgICBwcm90b1trZXldID0gc2VsZlByb3RvdHlwZVtrZXldO1xuLy8gICAgIH1cbi8vICAgICBzdWJDbGFzcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBzdWJDbGFzcztcbi8vICAgICBzdWJDbGFzcy5zdXBlckNsYXNzID0gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG5cbi8vICAgICByZXR1cm4gc3ViQ2xhc3M7XG4vLyB9O1xuIiwiLyoqXG4gKiBAZmlsZSDkuIDloIbpobnnm67ph4zpnaLluLjnlKjnmoTmlrnms5VcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG5leHBvcnRzLnNsaWNlID0gZnVuY3Rpb24gKGFyciwgc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnIsIHN0YXJ0LCBlbmQpO1xufTtcblxuLyoqXG4gKiDorqHnrpfooajovr7lvI/nmoTlgLxcbiAqXG4gKiBAaW5uZXJcbiAqIEBwYXJhbSAge3N0cmluZ30gZXhwcmVzc2lvbiDooajovr7lvI/lrZfnrKbkuLLvvIznsbvkvLzkuo4gYCR7bmFtZX1gIOS4reeahCBuYW1lXG4gKiBAcGFyYW0gIHtPYmplY3R9IGN1ckRhdGEgICAg5b2T5YmN6KGo6L6+5byP5a+55bqU55qE5pWw5o2uXG4gKiBAcmV0dXJuIHtzdHJpbmd9ICAgICAgICAgICAg6K6h566X57uT5p6cXG4gKi9cbmV4cG9ydHMuY2FsY3VsYXRlRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChleHByZXNzaW9uLCBjdXJEYXRhKSB7XG4gICAgdmFyIHBhcmFtcyA9IGdldFZhcmlhYmxlTmFtZXNGcm9tRXhwcihleHByZXNzaW9uKTtcblxuICAgIHZhciBmbkFyZ3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBwYXJhbXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICB2YXIgcGFyYW0gPSBwYXJhbXNbaV07XG4gICAgICAgIHZhciB2YWx1ZSA9IGN1ckRhdGFbcGFyYW1dO1xuICAgICAgICBmbkFyZ3MucHVzaCh2YWx1ZSA9PT0gdW5kZWZpbmVkID8gJycgOiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdDtcbiAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSAobmV3IEZ1bmN0aW9uKHBhcmFtcywgJ3JldHVybiAnICsgZXhwcmVzc2lvbikpLmFwcGx5KG51bGwsIGZuQXJncyk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIHJlc3VsdCA9ICcnO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5leHBvcnRzLmdvRGFyayA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgbm9kZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIH1cbiAgICBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIG5vZGUuX190ZXh0X18gPSBub2RlLm5vZGVWYWx1ZTtcbiAgICAgICAgbm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICB9XG59O1xuXG5leHBvcnRzLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgbm9kZS5zdHlsZS5kaXNwbGF5ID0gbnVsbDtcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBpZiAobm9kZS5fX3RleHRfXyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBub2RlLm5vZGVWYWx1ZSA9IG5vZGUuX190ZXh0X187XG4gICAgICAgICAgICBub2RlLl9fdGV4dF9fID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0cy5jcmVhdGVFeHByRm4gPSBmdW5jdGlvbiAoZXhwclJlZ0V4cCwgZXhwcikge1xuICAgIGV4cHIgPSBleHByLnJlcGxhY2UoZXhwclJlZ0V4cCwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gYXJndW1lbnRzWzFdO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJldHVybiBleHBvcnRzLmNhbGN1bGF0ZUV4cHJlc3Npb24oZXhwciwgZGF0YSk7XG4gICAgfTtcbn07XG5cbi8qKlxuICog6LaF57qn566A5Y2V55qEIGV4dGVuZCDvvIzlm6DkuLrmnKzlupPlr7kgZXh0ZW5kIOayoemCo+mrmOeahOimgeaxgu+8jFxuICog562J5Yiw5pyJ6KaB5rGC55qE5pe25YCZ5YaN5a6M5ZaE44CCXG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0gIHtPYmplY3R9IHRhcmdldCDnm67moIflr7nosaFcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgIOacgOe7iOWQiOW5tuWQjueahOWvueixoVxuICovXG5leHBvcnRzLmV4dGVuZCA9IGZ1bmN0aW9uICh0YXJnZXQpIHtcbiAgICB2YXIgc3JjcyA9IGV4cG9ydHMuc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBzcmNzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgLyogZXNsaW50LWRpc2FibGUgZ3VhcmQtZm9yLWluICovXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzcmNzW2ldKSB7XG4gICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNyY3NbaV1ba2V5XTtcbiAgICAgICAgfVxuICAgICAgICAvKiBlc2xpbnQtZW5hYmxlIGd1YXJkLWZvci1pbiAqL1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufTtcblxuZXhwb3J0cy50cmF2ZXJzZU5vQ2hhbmdlTm9kZXMgPSBmdW5jdGlvbiAoc3RhcnROb2RlLCBlbmROb2RlLCBub2RlRm4sIGNvbnRleHQpIHtcbiAgICBmb3IgKHZhciBjdXJOb2RlID0gc3RhcnROb2RlO1xuICAgICAgICBjdXJOb2RlICYmIGN1ck5vZGUgIT09IGVuZE5vZGU7XG4gICAgICAgIGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nXG4gICAgKSB7XG4gICAgICAgIGlmIChub2RlRm4uY2FsbChjb250ZXh0LCBjdXJOb2RlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbm9kZUZuLmNhbGwoY29udGV4dCwgZW5kTm9kZSk7XG59O1xuXG5leHBvcnRzLnRyYXZlcnNlTm9kZXMgPSBmdW5jdGlvbiAoc3RhcnROb2RlLCBlbmROb2RlLCBub2RlRm4sIGNvbnRleHQpIHtcbiAgICB2YXIgbm9kZXMgPSBbXTtcbiAgICBmb3IgKHZhciBjdXJOb2RlID0gc3RhcnROb2RlO1xuICAgICAgICBjdXJOb2RlICYmIGN1ck5vZGUgIT09IGVuZE5vZGU7XG4gICAgICAgIGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nXG4gICAgKSB7XG4gICAgICAgIG5vZGVzLnB1c2goY3VyTm9kZSk7XG4gICAgfVxuXG4gICAgbm9kZXMucHVzaChlbmROb2RlKTtcblxuICAgIGV4cG9ydHMuZWFjaChub2Rlcywgbm9kZUZuLCBjb250ZXh0KTtcbn07XG5cbmV4cG9ydHMuZWFjaCA9IGZ1bmN0aW9uIChhcnIsIGZuLCBjb250ZXh0KSB7XG4gICAgaWYgKGV4cG9ydHMuaXNBcnJheShhcnIpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGFyci5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZm4uY2FsbChjb250ZXh0LCBhcnJbaV0sIGksIGFycikpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgYXJyID09PSAnb2JqZWN0Jykge1xuICAgICAgICBmb3IgKHZhciBrIGluIGFycikge1xuICAgICAgICAgICAgaWYgKGZuLmNhbGwoY29udGV4dCwgYXJyW2tdLCBrLCBhcnIpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5leHBvcnRzLmlzQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09PSAnb2JqZWN0IEFycmF5Jztcbn07XG5cbi8qKlxuICog5LuO6KGo6L6+5byP5Lit5oq956a75Ye65Y+Y6YeP5ZCNXG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV4cHIg6KGo6L6+5byP5a2X56ym5Liy77yM57G75Ly85LqOIGAke25hbWV9YCDkuK3nmoQgbmFtZVxuICogQHJldHVybiB7QXJyYXkuPHN0cmluZz59ICAgICAg5Y+Y6YeP5ZCN5pWw57uEXG4gKi9cbnZhciBleHByTmFtZU1hcCA9IHt9O1xudmFyIGV4cHJOYW1lUmVnRXhwID0gL1xcLj9cXCQ/KFthLXp8QS1aXSt8KFthLXp8QS1aXStbMC05XStbYS16fEEtWl0qKSkvZztcbmZ1bmN0aW9uIGdldFZhcmlhYmxlTmFtZXNGcm9tRXhwcihleHByKSB7XG4gICAgaWYgKGV4cHJOYW1lTWFwW2V4cHJdKSB7XG4gICAgICAgIHJldHVybiBleHByTmFtZU1hcFtleHByXTtcbiAgICB9XG5cbiAgICB2YXIgbWF0Y2hlcyA9IGV4cHIubWF0Y2goZXhwck5hbWVSZWdFeHApIHx8IFtdO1xuICAgIHZhciBuYW1lcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IG1hdGNoZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICBpZiAobWF0Y2hlc1tpXSAmJiBtYXRjaGVzW2ldWzBdICE9PSAnLicpIHtcbiAgICAgICAgICAgIG5hbWVzLnB1c2gobWF0Y2hlc1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBleHByTmFtZU1hcFtleHByXSA9IG5hbWVzO1xuXG4gICAgcmV0dXJuIG5hbWVzO1xufVxuIiwid2luZG93LkV4cHJQYXJzZXIgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4uL3NyYy9FeHByUGFyc2VyLmpzJyk7Il19
