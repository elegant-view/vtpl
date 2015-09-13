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
 * @protectedß
 * @param {Object} options 来自于构造函数
 */
Parser.prototype.initialize = function (options) {
    this.exprCalculater = options.exprCalculater;
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
    return Object.prototype.toString.call(arr) === 'object Array';
};

},{}],5:[function(require,module,exports){
window.ExprParser = module.exports = require('../src/ExprParser.js');
},{"../src/ExprParser.js":1}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9FeHByUGFyc2VyLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL1BhcnNlci5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9pbmhlcml0LmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL3V0aWxzLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvdG1wL2Zha2VfY2MzOWZmZTMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQGZpbGUg6KGo6L6+5byP6Kej5p6Q5Zmo77yM5LiA5Liq5paH5pys6IqC54K55oiW6ICF5YWD57Sg6IqC54K55a+55bqU5LiA5Liq6KGo6L6+5byP6Kej5p6Q5Zmo5a6e5L6LXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxudmFyIFBhcnNlciA9IHJlcXVpcmUoJy4vUGFyc2VyJyk7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJy4vaW5oZXJpdCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBFeHByUGFyc2VyKG9wdGlvbnMpIHtcbiAgICBQYXJzZXIuY2FsbCh0aGlzLCBvcHRpb25zKTtcbn1cblxuRXhwclBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICB0aGlzLm5vZGUgPSBvcHRpb25zLm5vZGU7XG4gICAgdGhpcy5jb25maWcgPSBvcHRpb25zLmNvbmZpZztcblxuICAgIHRoaXMuZXhwcnMgPSBbXTtcbiAgICB0aGlzLmV4cHJGbnMgPSB7fTtcbiAgICB0aGlzLnVwZGF0ZUZucyA9IHt9O1xuICAgIHRoaXMuZXhwck9sZFZhbHVlcyA9IHt9O1xufTtcblxuLyoqXG4gKiDmkJzpm4bov4fnqItcbiAqXG4gKiBAcHVibGljXG4gKi9cbkV4cHJQYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyTm9kZSA9IHRoaXMubm9kZTtcblxuICAgIC8vIOaWh+acrOiKgueCuVxuICAgIGlmIChjdXJOb2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIHRoaXMuYWRkRXhwcigpO1xuICAgIH1cbiAgICAvLyDlhYPntKDoioLngrlcbiAgICBlbHNlIGlmIChjdXJOb2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIHZhciBhdHRyaWJ1dGVzID0gY3VyTm9kZS5hdHRyaWJ1dGVzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBhdHRyaWJ1dGVzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuYWRkRXhwcihhdHRyaWJ1dGVzW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICog5re75Yqg6KGo6L6+5byPXG4gKlxuICogQHByb3RlY3RlZFxuICogQHBhcmFtIHtBdHRyfSBhdHRyIOWmguaenOW9k+WJjeaYr+WFg+e0oOiKgueCue+8jOWImeimgeS8oOWFpemBjeWOhuWIsOeahOWxnuaAp1xuICovXG5FeHByUGFyc2VyLnByb3RvdHlwZS5hZGRFeHByID0gZnVuY3Rpb24gKGF0dHIpIHtcbiAgICB2YXIgZXhwciA9IGF0dHIgPyBhdHRyLnZhbHVlIDogdGhpcy5ub2RlLm5vZGVWYWx1ZTtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmdldEV4cHJSZWdFeHAoKS50ZXN0KGV4cHIpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYWRkRXhwcihcbiAgICAgICAgdGhpcyxcbiAgICAgICAgZXhwcixcbiAgICAgICAgYXR0ciA/IGNyZWF0ZUF0dHJVcGRhdGVGbihhdHRyKSA6IChmdW5jdGlvbiAoY3VyTm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChleHByVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBjdXJOb2RlLm5vZGVWYWx1ZSA9IGV4cHJWYWx1ZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pKHRoaXMubm9kZSlcbiAgICApO1xufTtcblxuLyoqXG4gKiDorr7nva7mlbDmja7ov4fnqItcbiAqXG4gKiBAcHVibGljXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSDmlbDmja5cbiAqL1xuRXhwclBhcnNlci5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGV4cHJzID0gdGhpcy5leHBycztcbiAgICB2YXIgZXhwck9sZFZhbHVlcyA9IHRoaXMuZXhwck9sZFZhbHVlcztcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBleHBycy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIHZhciBleHByID0gZXhwcnNbaV07XG4gICAgICAgIHZhciBleHByVmFsdWUgPSB0aGlzLmV4cHJGbnNbZXhwcl0oZGF0YSk7XG5cbiAgICAgICAgaWYgKHRoaXMuZGlydHlDaGVjayhleHByLCBleHByVmFsdWUsIGV4cHJPbGRWYWx1ZXNbZXhwcl0pKSB7XG4gICAgICAgICAgICB2YXIgdXBkYXRlRm5zID0gdGhpcy51cGRhdGVGbnNbZXhwcl07XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMCwgamwgPSB1cGRhdGVGbnMubGVuZ3RoOyBqIDwgamw7IGorKykge1xuICAgICAgICAgICAgICAgIHVwZGF0ZUZuc1tqXShleHByVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwck9sZFZhbHVlc1tleHByXSA9IGV4cHJWYWx1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIOiKgueCueKAnOmakOiXj+KAnei1t+adpVxuICpcbiAqIEBwdWJsaWNcbiAqL1xuRXhwclBhcnNlci5wcm90b3R5cGUuZ29EYXJrID0gZnVuY3Rpb24gKCkge1xuICAgIHV0aWxzLmdvRGFyayh0aGlzLm5vZGUpO1xufTtcblxuLyoqXG4gKiDoioLngrnigJzmmL7npLrigJ3lh7rmnaVcbiAqXG4gKiBAcHVibGljXG4gKi9cbkV4cHJQYXJzZXIucHJvdG90eXBlLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy5yZXN0b3JlRnJvbURhcmsodGhpcy5ub2RlKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0KEV4cHJQYXJzZXIsIFBhcnNlcik7XG5cbmZ1bmN0aW9uIGNyZWF0ZUF0dHJVcGRhdGVGbihhdHRyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChleHByVmFsdWUpIHtcbiAgICAgICAgYXR0ci52YWx1ZSA9IGV4cHJWYWx1ZTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBhZGRFeHByKHBhcnNlciwgZXhwciwgdXBkYXRlRm4pIHtcbiAgICBwYXJzZXIuZXhwcnMucHVzaChleHByKTtcbiAgICBpZiAoIXBhcnNlci5leHByRm5zW2V4cHJdKSB7XG4gICAgICAgIHBhcnNlci5leHByRm5zW2V4cHJdID0gY3JlYXRlRXhwckZuKHBhcnNlciwgZXhwcik7XG4gICAgfVxuICAgIHBhcnNlci51cGRhdGVGbnNbZXhwcl0gPSBwYXJzZXIudXBkYXRlRm5zW2V4cHJdIHx8IFtdO1xuICAgIHBhcnNlci51cGRhdGVGbnNbZXhwcl0ucHVzaCh1cGRhdGVGbik7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUV4cHJGbihwYXJzZXIsIGV4cHIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGV4cHIucmVwbGFjZShwYXJzZXIuY29uZmlnLmdldEV4cHJSZWdFeHAoKSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcGFyc2VyLmV4cHJDYWxjdWxhdGVyLmNyZWF0ZUV4cHJGbihhcmd1bWVudHNbMV0pO1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlci5leHByQ2FsY3VsYXRlci5jYWxjdWxhdGUoYXJndW1lbnRzWzFdLCBmYWxzZSwgZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG4iLCIvKipcbiAqIEBmaWxlIOino+aekOWZqOeahOaKveixoeWfuuexu1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbi8qKlxuICog5p6E6YCg5Ye95pWwXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDphY3nva7lj4LmlbDvvIzkuIDoiKzlj6/og73kvJrmnInlpoLkuIvlhoXlrrnvvJpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydE5vZGU6IC4uLixcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmROb2RlOiAuLi4sXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogLi4uLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZzogLi4uXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICDlhbfkvZPmmK/llaXlj6/ku6Xlj4LliqDlhbfkvZPnmoTlrZDnsbtcbiAqL1xuZnVuY3Rpb24gUGFyc2VyKG9wdGlvbnMpIHtcbiAgICB0aGlzLmluaXRpYWxpemUob3B0aW9ucyk7XG59XG5cbi8qKlxuICog5Yid5aeL5YyWXG4gKlxuICogQHByb3RlY3RlZMOfXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDmnaXoh6rkuo7mnoTpgKDlh73mlbBcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB0aGlzLmV4cHJDYWxjdWxhdGVyID0gb3B0aW9ucy5leHByQ2FsY3VsYXRlcjtcbn07XG5cbi8qKlxuICog6ZSA5q+B6Kej5p6Q5ZmoXG4gKlxuICogQHB1YmxpY1xuICogQGFic3RyYWN0XG4gKi9cblBhcnNlci5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vKipcbiAqIOiuvue9ruaVsOaNrlxuICpcbiAqIEBwdWJsaWNcbiAqIEBhYnN0cmFjdFxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEg6KaB6K6+572u55qE5pWw5o2uXG4gKi9cblBhcnNlci5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7fTtcblxuLyoqXG4gKiDpmpDol4/nm7jlhbPlhYPntKBcbiAqXG4gKiBAcHVibGljXG4gKi9cblBhcnNlci5wcm90b3R5cGUuZ29EYXJrID0gZnVuY3Rpb24gKCkge307XG5cbi8qKlxuICog5pi+56S655u45YWz5YWD57SgXG4gKlxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vKipcbiAqIOaQnOmbhuihqOi+vuW8j++8jOeUn+aIkOihqOi+vuW8j+WHveaVsOWSjCBET00g5pu05paw5Ye95pWwXG4gKlxuICogQGFic3RyYWN0XG4gKiBAcHVibGljXG4gKi9cblBhcnNlci5wcm90b3R5cGUuY29sbGVjdEV4cHJzID0gZnVuY3Rpb24gKCkge307XG5cblBhcnNlci5wcm90b3R5cGUuZGlydHlDaGVjayA9IGZ1bmN0aW9uIChleHByLCBleHByVmFsdWUsIGV4cHJPbGRWYWx1ZSkge1xuICAgIHZhciBkaXJ0eUNoZWNrZXJGbiA9IHRoaXMuZGlydHlDaGVja2VyID8gdGhpcy5kaXJ0eUNoZWNrZXIuZ2V0Q2hlY2tlcihleHByKSA6IG51bGw7XG4gICAgcmV0dXJuIChkaXJ0eUNoZWNrZXJGbiAmJiBkaXJ0eUNoZWNrZXJGbihleHByLCBleHByVmFsdWUsIGV4cHJPbGRWYWx1ZSkpXG4gICAgICAgICAgICB8fCAoIWRpcnR5Q2hlY2tlckZuICYmIGV4cHJWYWx1ZSAhPT0gZXhwck9sZFZhbHVlKTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUuc2V0RGlydHlDaGVja2VyID0gZnVuY3Rpb24gKGRpcnR5Q2hlY2tlcikge1xuICAgIHRoaXMuZGlydHlDaGVja2VyID0gZGlydHlDaGVja2VyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYXJzZXI7XG4iLCIvKipcbiAqIEBmaWxlIOe7p+aJv1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbmZ1bmN0aW9uIGluaGVyaXQoQ2hpbGRDbGFzcywgUGFyZW50Q2xhc3MpIHtcbiAgICB2YXIgY2hpbGRQcm90byA9IENoaWxkQ2xhc3MucHJvdG90eXBlO1xuICAgIENoaWxkQ2xhc3MucHJvdG90eXBlID0gbmV3IFBhcmVudENsYXNzKHt9KTtcbiAgICBmb3IgKHZhciBrZXkgaW4gY2hpbGRQcm90bykge1xuICAgICAgICBpZiAoY2hpbGRQcm90by5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBDaGlsZENsYXNzLnByb3RvdHlwZVtrZXldID0gY2hpbGRQcm90b1trZXldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBDaGlsZENsYXNzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluaGVyaXQ7XG5cbi8vIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7XG4vLyAgICAgdmFyIEVtcHR5ID0gZnVuY3Rpb24gKCkge307XG4vLyAgICAgRW1wdHkucHJvdG90eXBlID0gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG4vLyAgICAgdmFyIHNlbGZQcm90b3R5cGUgPSBzdWJDbGFzcy5wcm90b3R5cGU7XG4vLyAgICAgdmFyIHByb3RvID0gc3ViQ2xhc3MucHJvdG90eXBlID0gbmV3IEVtcHR5KCk7XG5cbi8vICAgICBmb3IgKHZhciBrZXkgaW4gc2VsZlByb3RvdHlwZSkge1xuLy8gICAgICAgICBwcm90b1trZXldID0gc2VsZlByb3RvdHlwZVtrZXldO1xuLy8gICAgIH1cbi8vICAgICBzdWJDbGFzcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBzdWJDbGFzcztcbi8vICAgICBzdWJDbGFzcy5zdXBlckNsYXNzID0gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG5cbi8vICAgICByZXR1cm4gc3ViQ2xhc3M7XG4vLyB9O1xuIiwiLyoqXG4gKiBAZmlsZSDkuIDloIbpobnnm67ph4zpnaLluLjnlKjnmoTmlrnms5VcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG5leHBvcnRzLnNsaWNlID0gZnVuY3Rpb24gKGFyciwgc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnIsIHN0YXJ0LCBlbmQpO1xufTtcblxuZXhwb3J0cy5nb0RhcmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBub2RlLl9fdGV4dF9fID0gbm9kZS5ub2RlVmFsdWU7XG4gICAgICAgIG5vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgfVxufTtcblxuZXhwb3J0cy5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgaWYgKG5vZGUuX190ZXh0X18gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbm9kZS5ub2RlVmFsdWUgPSBub2RlLl9fdGV4dF9fO1xuICAgICAgICAgICAgbm9kZS5fX3RleHRfXyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmV4cG9ydHMuY3JlYXRlRXhwckZuID0gZnVuY3Rpb24gKGV4cHJSZWdFeHAsIGV4cHIsIGV4cHJDYWxjdWxhdGVyKSB7XG4gICAgZXhwciA9IGV4cHIucmVwbGFjZShleHByUmVnRXhwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBhcmd1bWVudHNbMV07XG4gICAgfSk7XG4gICAgZXhwckNhbGN1bGF0ZXIuY3JlYXRlRXhwckZuKGV4cHIpO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJldHVybiBleHByQ2FsY3VsYXRlci5jYWxjdWxhdGUoZXhwciwgZmFsc2UsIGRhdGEpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIOi2hee6p+eugOWNleeahCBleHRlbmQg77yM5Zug5Li65pys5bqT5a+5IGV4dGVuZCDmsqHpgqPpq5jnmoTopoHmsYLvvIxcbiAqIOetieWIsOacieimgeaxgueahOaXtuWAmeWGjeWujOWWhOOAglxuICpcbiAqIEBpbm5lclxuICogQHBhcmFtICB7T2JqZWN0fSB0YXJnZXQg55uu5qCH5a+56LGhXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICDmnIDnu4jlkIjlubblkI7nmoTlr7nosaFcbiAqL1xuZXhwb3J0cy5leHRlbmQgPSBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gICAgdmFyIHNyY3MgPSBleHBvcnRzLnNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gc3Jjcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIC8qIGVzbGludC1kaXNhYmxlIGd1YXJkLWZvci1pbiAqL1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3Jjc1tpXSkge1xuICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzcmNzW2ldW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgLyogZXNsaW50LWVuYWJsZSBndWFyZC1mb3ItaW4gKi9cbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn07XG5cbmV4cG9ydHMudHJhdmVyc2VOb0NoYW5nZU5vZGVzID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgbm9kZUZuLCBjb250ZXh0KSB7XG4gICAgZm9yICh2YXIgY3VyTm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICAgICAgY3VyTm9kZSAmJiBjdXJOb2RlICE9PSBlbmROb2RlO1xuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZ1xuICAgICkge1xuICAgICAgICBpZiAobm9kZUZuLmNhbGwoY29udGV4dCwgY3VyTm9kZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5vZGVGbi5jYWxsKGNvbnRleHQsIGVuZE5vZGUpO1xufTtcblxuZXhwb3J0cy50cmF2ZXJzZU5vZGVzID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgbm9kZUZuLCBjb250ZXh0KSB7XG4gICAgdmFyIG5vZGVzID0gW107XG4gICAgZm9yICh2YXIgY3VyTm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICAgICAgY3VyTm9kZSAmJiBjdXJOb2RlICE9PSBlbmROb2RlO1xuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZ1xuICAgICkge1xuICAgICAgICBub2Rlcy5wdXNoKGN1ck5vZGUpO1xuICAgIH1cblxuICAgIG5vZGVzLnB1c2goZW5kTm9kZSk7XG5cbiAgICBleHBvcnRzLmVhY2gobm9kZXMsIG5vZGVGbiwgY29udGV4dCk7XG59O1xuXG5leHBvcnRzLmVhY2ggPSBmdW5jdGlvbiAoYXJyLCBmbiwgY29udGV4dCkge1xuICAgIGlmIChleHBvcnRzLmlzQXJyYXkoYXJyKSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBhcnIubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgaWYgKGZuLmNhbGwoY29udGV4dCwgYXJyW2ldLCBpLCBhcnIpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGFyciA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBhcnIpIHtcbiAgICAgICAgICAgIGlmIChmbi5jYWxsKGNvbnRleHQsIGFycltrXSwgaywgYXJyKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0cy5pc0FycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PT0gJ29iamVjdCBBcnJheSc7XG59O1xuIiwid2luZG93LkV4cHJQYXJzZXIgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4uL3NyYy9FeHByUGFyc2VyLmpzJyk7Il19
