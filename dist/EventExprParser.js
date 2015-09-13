(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @file 处理了事件的 ExprParser
 * @author yibuyisheng(yibuyisheng@163.com)
 */

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

},{}],6:[function(require,module,exports){
window.EventExprParser = module.exports = require('../src/EventExprParser.js');
},{"../src/EventExprParser.js":1}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9FdmVudEV4cHJQYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvRXhwclBhcnNlci5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9QYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvaW5oZXJpdC5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3RtcC9mYWtlXzExNGY2YjIwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQGZpbGUg5aSE55CG5LqG5LqL5Lu255qEIEV4cHJQYXJzZXJcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG52YXIgRXhwclBhcnNlciA9IHJlcXVpcmUoJy4vRXhwclBhcnNlcicpO1xudmFyIGluaGVyaXQgPSByZXF1aXJlKCcuL2luaGVyaXQnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuZnVuY3Rpb24gRXZlbnRFeHByUGFyc2VyKG9wdGlvbnMpIHtcbiAgICBFeHByUGFyc2VyLmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG5cbkV2ZW50RXhwclBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgRXhwclBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5ldmVudHMgPSB7fTtcbn07XG5cbkV2ZW50RXhwclBhcnNlci5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgRXhwclBhcnNlci5wcm90b3R5cGUuc2V0RGF0YS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5jdXJEYXRhID0gZGF0YTtcbn07XG5cbkV2ZW50RXhwclBhcnNlci5wcm90b3R5cGUuYWRkRXhwciA9IGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgaWYgKCFhdHRyKSB7XG4gICAgICAgIHJldHVybiBFeHByUGFyc2VyLnByb3RvdHlwZS5hZGRFeHByLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgdmFyIGV2ZW50TmFtZSA9IGdldEV2ZW50TmFtZShhdHRyLm5hbWUsIHRoaXMuY29uZmlnKTtcbiAgICBpZiAoZXZlbnROYW1lKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5nZXRFeHByUmVnRXhwKCkudGVzdChhdHRyLnZhbHVlKSkge1xuICAgICAgICAgICAgdGhpcy5ldmVudHNbZXZlbnROYW1lXSA9IGF0dHIudmFsdWU7XG5cbiAgICAgICAgICAgIHZhciBleHByID0gYXR0ci52YWx1ZS5yZXBsYWNlKFxuICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLmdldEV4cHJSZWdFeHAoKSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmd1bWVudHNbMV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRoaXMuZXhwckNhbGN1bGF0ZXIuY3JlYXRlRXhwckZuKGV4cHIsIHRydWUpO1xuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgdGhpcy5ub2RlWydvbicgKyBldmVudE5hbWVdID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgbWUuZXhwckNhbGN1bGF0ZXIuY2FsY3VsYXRlKGV4cHIsIHRydWUsIHV0aWxzLmV4dGVuZCh7fSwgbWUuY3VyRGF0YSwge2V2ZW50OiBldmVudH0pKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIEV4cHJQYXJzZXIucHJvdG90eXBlLmFkZEV4cHIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGluaGVyaXQoRXZlbnRFeHByUGFyc2VyLCBFeHByUGFyc2VyKTtcblxuXG5mdW5jdGlvbiBnZXRFdmVudE5hbWUoYXR0ck5hbWUsIGNvbmZpZykge1xuICAgIGlmIChhdHRyTmFtZS5pbmRleE9mKGNvbmZpZy5ldmVudFByZWZpeCArICctJykgPT09IC0xKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICByZXR1cm4gYXR0ck5hbWUucmVwbGFjZShjb25maWcuZXZlbnRQcmVmaXggKyAnLScsICcnKTtcbn1cblxuIiwiLyoqXG4gKiBAZmlsZSDooajovr7lvI/op6PmnpDlmajvvIzkuIDkuKrmlofmnKzoioLngrnmiJbogIXlhYPntKDoioLngrnlr7nlupTkuIDkuKrooajovr7lvI/op6PmnpDlmajlrp7kvotcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG52YXIgUGFyc2VyID0gcmVxdWlyZSgnLi9QYXJzZXInKTtcbnZhciBpbmhlcml0ID0gcmVxdWlyZSgnLi9pbmhlcml0Jyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIEV4cHJQYXJzZXIob3B0aW9ucykge1xuICAgIFBhcnNlci5jYWxsKHRoaXMsIG9wdGlvbnMpO1xufVxuXG5FeHByUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBQYXJzZXIucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHRoaXMubm9kZSA9IG9wdGlvbnMubm9kZTtcbiAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xuXG4gICAgdGhpcy5leHBycyA9IFtdO1xuICAgIHRoaXMuZXhwckZucyA9IHt9O1xuICAgIHRoaXMudXBkYXRlRm5zID0ge307XG4gICAgdGhpcy5leHByT2xkVmFsdWVzID0ge307XG59O1xuXG4vKipcbiAqIOaQnOmbhui/h+eoi1xuICpcbiAqIEBwdWJsaWNcbiAqL1xuRXhwclBhcnNlci5wcm90b3R5cGUuY29sbGVjdEV4cHJzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJOb2RlID0gdGhpcy5ub2RlO1xuXG4gICAgLy8g5paH5pys6IqC54K5XG4gICAgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgdGhpcy5hZGRFeHByKCk7XG4gICAgfVxuICAgIC8vIOWFg+e0oOiKgueCuVxuICAgIGVsc2UgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBjdXJOb2RlLmF0dHJpYnV0ZXM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGF0dHJpYnV0ZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5hZGRFeHByKGF0dHJpYnV0ZXNbaV0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiDmt7vliqDooajovr7lvI9cbiAqXG4gKiBAcHJvdGVjdGVkXG4gKiBAcGFyYW0ge0F0dHJ9IGF0dHIg5aaC5p6c5b2T5YmN5piv5YWD57Sg6IqC54K577yM5YiZ6KaB5Lyg5YWl6YGN5Y6G5Yiw55qE5bGe5oCnXG4gKi9cbkV4cHJQYXJzZXIucHJvdG90eXBlLmFkZEV4cHIgPSBmdW5jdGlvbiAoYXR0cikge1xuICAgIHZhciBleHByID0gYXR0ciA/IGF0dHIudmFsdWUgOiB0aGlzLm5vZGUubm9kZVZhbHVlO1xuICAgIGlmICghdGhpcy5jb25maWcuZ2V0RXhwclJlZ0V4cCgpLnRlc3QoZXhwcikpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhZGRFeHByKFxuICAgICAgICB0aGlzLFxuICAgICAgICBleHByLFxuICAgICAgICBhdHRyID8gY3JlYXRlQXR0clVwZGF0ZUZuKGF0dHIpIDogKGZ1bmN0aW9uIChjdXJOb2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGV4cHJWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGN1ck5vZGUubm9kZVZhbHVlID0gZXhwclZhbHVlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSkodGhpcy5ub2RlKVxuICAgICk7XG59O1xuXG4vKipcbiAqIOiuvue9ruaVsOaNrui/h+eoi1xuICpcbiAqIEBwdWJsaWNcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIOaVsOaNrlxuICovXG5FeHByUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgZXhwcnMgPSB0aGlzLmV4cHJzO1xuICAgIHZhciBleHByT2xkVmFsdWVzID0gdGhpcy5leHByT2xkVmFsdWVzO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGV4cHJzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgdmFyIGV4cHIgPSBleHByc1tpXTtcbiAgICAgICAgdmFyIGV4cHJWYWx1ZSA9IHRoaXMuZXhwckZuc1tleHByXShkYXRhKTtcblxuICAgICAgICBpZiAodGhpcy5kaXJ0eUNoZWNrKGV4cHIsIGV4cHJWYWx1ZSwgZXhwck9sZFZhbHVlc1tleHByXSkpIHtcbiAgICAgICAgICAgIHZhciB1cGRhdGVGbnMgPSB0aGlzLnVwZGF0ZUZuc1tleHByXTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwLCBqbCA9IHVwZGF0ZUZucy5sZW5ndGg7IGogPCBqbDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlRm5zW2pdKGV4cHJWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHByT2xkVmFsdWVzW2V4cHJdID0gZXhwclZhbHVlO1xuICAgIH1cbn07XG5cbi8qKlxuICog6IqC54K54oCc6ZqQ6JeP4oCd6LW35p2lXG4gKlxuICogQHB1YmxpY1xuICovXG5FeHByUGFyc2VyLnByb3RvdHlwZS5nb0RhcmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgdXRpbHMuZ29EYXJrKHRoaXMubm9kZSk7XG59O1xuXG4vKipcbiAqIOiKgueCueKAnOaYvuekuuKAneWHuuadpVxuICpcbiAqIEBwdWJsaWNcbiAqL1xuRXhwclBhcnNlci5wcm90b3R5cGUucmVzdG9yZUZyb21EYXJrID0gZnVuY3Rpb24gKCkge1xuICAgIHV0aWxzLnJlc3RvcmVGcm9tRGFyayh0aGlzLm5vZGUpO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGluaGVyaXQoRXhwclBhcnNlciwgUGFyc2VyKTtcblxuZnVuY3Rpb24gY3JlYXRlQXR0clVwZGF0ZUZuKGF0dHIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGV4cHJWYWx1ZSkge1xuICAgICAgICBhdHRyLnZhbHVlID0gZXhwclZhbHVlO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGFkZEV4cHIocGFyc2VyLCBleHByLCB1cGRhdGVGbikge1xuICAgIHBhcnNlci5leHBycy5wdXNoKGV4cHIpO1xuICAgIGlmICghcGFyc2VyLmV4cHJGbnNbZXhwcl0pIHtcbiAgICAgICAgcGFyc2VyLmV4cHJGbnNbZXhwcl0gPSBjcmVhdGVFeHByRm4ocGFyc2VyLCBleHByKTtcbiAgICB9XG4gICAgcGFyc2VyLnVwZGF0ZUZuc1tleHByXSA9IHBhcnNlci51cGRhdGVGbnNbZXhwcl0gfHwgW107XG4gICAgcGFyc2VyLnVwZGF0ZUZuc1tleHByXS5wdXNoKHVwZGF0ZUZuKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRXhwckZuKHBhcnNlciwgZXhwcikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICByZXR1cm4gZXhwci5yZXBsYWNlKHBhcnNlci5jb25maWcuZ2V0RXhwclJlZ0V4cCgpLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBwYXJzZXIuZXhwckNhbGN1bGF0ZXIuY3JlYXRlRXhwckZuKGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VyLmV4cHJDYWxjdWxhdGVyLmNhbGN1bGF0ZShhcmd1bWVudHNbMV0sIGZhbHNlLCBkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbn1cbiIsIi8qKlxuICogQGZpbGUg6Kej5p6Q5Zmo55qE5oq96LGh5Z+657G7XG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxuLyoqXG4gKiDmnoTpgKDlh73mlbBcbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIOmFjee9ruWPguaVsO+8jOS4gOiIrOWPr+iDveS8muacieWmguS4i+WGheWuue+8mlxuICogICAgICAgICAgICAgICAgICAgICAgICAge1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0Tm9kZTogLi4uLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZE5vZGU6IC4uLixcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlOiAuLi4sXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnOiAuLi5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAqICAgICAgICAgICAgICAgICAgICAgICAgIOWFt+S9k+aYr+WVpeWPr+S7peWPguWKoOWFt+S9k+eahOWtkOexu1xuICovXG5mdW5jdGlvbiBQYXJzZXIob3B0aW9ucykge1xuICAgIHRoaXMuaW5pdGlhbGl6ZShvcHRpb25zKTtcbn1cblxuLyoqXG4gKiDliJ3lp4vljJZcbiAqXG4gKiBAcHJvdGVjdGVkw59cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIOadpeiHquS6juaehOmAoOWHveaVsFxuICovXG5QYXJzZXIucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHRoaXMuZXhwckNhbGN1bGF0ZXIgPSBvcHRpb25zLmV4cHJDYWxjdWxhdGVyO1xufTtcblxuLyoqXG4gKiDplIDmr4Hop6PmnpDlmahcbiAqXG4gKiBAcHVibGljXG4gKiBAYWJzdHJhY3RcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge307XG5cbi8qKlxuICog6K6+572u5pWw5o2uXG4gKlxuICogQHB1YmxpY1xuICogQGFic3RyYWN0XG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSDopoHorr7nva7nmoTmlbDmja5cbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHt9O1xuXG4vKipcbiAqIOmakOiXj+ebuOWFs+WFg+e0oFxuICpcbiAqIEBwdWJsaWNcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5nb0RhcmsgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDmmL7npLrnm7jlhbPlhYPntKBcbiAqXG4gKiBAcHVibGljXG4gKi9cblBhcnNlci5wcm90b3R5cGUucmVzdG9yZUZyb21EYXJrID0gZnVuY3Rpb24gKCkge307XG5cbi8qKlxuICog5pCc6ZuG6KGo6L6+5byP77yM55Sf5oiQ6KGo6L6+5byP5Ye95pWw5ZKMIERPTSDmm7TmlrDlh73mlbBcbiAqXG4gKiBAYWJzdHJhY3RcbiAqIEBwdWJsaWNcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5jb2xsZWN0RXhwcnMgPSBmdW5jdGlvbiAoKSB7fTtcblxuUGFyc2VyLnByb3RvdHlwZS5kaXJ0eUNoZWNrID0gZnVuY3Rpb24gKGV4cHIsIGV4cHJWYWx1ZSwgZXhwck9sZFZhbHVlKSB7XG4gICAgdmFyIGRpcnR5Q2hlY2tlckZuID0gdGhpcy5kaXJ0eUNoZWNrZXIgPyB0aGlzLmRpcnR5Q2hlY2tlci5nZXRDaGVja2VyKGV4cHIpIDogbnVsbDtcbiAgICByZXR1cm4gKGRpcnR5Q2hlY2tlckZuICYmIGRpcnR5Q2hlY2tlckZuKGV4cHIsIGV4cHJWYWx1ZSwgZXhwck9sZFZhbHVlKSlcbiAgICAgICAgICAgIHx8ICghZGlydHlDaGVja2VyRm4gJiYgZXhwclZhbHVlICE9PSBleHByT2xkVmFsdWUpO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5zZXREaXJ0eUNoZWNrZXIgPSBmdW5jdGlvbiAoZGlydHlDaGVja2VyKSB7XG4gICAgdGhpcy5kaXJ0eUNoZWNrZXIgPSBkaXJ0eUNoZWNrZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhcnNlcjtcbiIsIi8qKlxuICogQGZpbGUg57un5om/XG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxuZnVuY3Rpb24gaW5oZXJpdChDaGlsZENsYXNzLCBQYXJlbnRDbGFzcykge1xuICAgIHZhciBjaGlsZFByb3RvID0gQ2hpbGRDbGFzcy5wcm90b3R5cGU7XG4gICAgQ2hpbGRDbGFzcy5wcm90b3R5cGUgPSBuZXcgUGFyZW50Q2xhc3Moe30pO1xuICAgIGZvciAodmFyIGtleSBpbiBjaGlsZFByb3RvKSB7XG4gICAgICAgIGlmIChjaGlsZFByb3RvLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIENoaWxkQ2xhc3MucHJvdG90eXBlW2tleV0gPSBjaGlsZFByb3RvW2tleV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIENoaWxkQ2xhc3M7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5oZXJpdDtcblxuLy8gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHtcbi8vICAgICB2YXIgRW1wdHkgPSBmdW5jdGlvbiAoKSB7fTtcbi8vICAgICBFbXB0eS5wcm90b3R5cGUgPSBzdXBlckNsYXNzLnByb3RvdHlwZTtcbi8vICAgICB2YXIgc2VsZlByb3RvdHlwZSA9IHN1YkNsYXNzLnByb3RvdHlwZTtcbi8vICAgICB2YXIgcHJvdG8gPSBzdWJDbGFzcy5wcm90b3R5cGUgPSBuZXcgRW1wdHkoKTtcblxuLy8gICAgIGZvciAodmFyIGtleSBpbiBzZWxmUHJvdG90eXBlKSB7XG4vLyAgICAgICAgIHByb3RvW2tleV0gPSBzZWxmUHJvdG90eXBlW2tleV07XG4vLyAgICAgfVxuLy8gICAgIHN1YkNsYXNzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IHN1YkNsYXNzO1xuLy8gICAgIHN1YkNsYXNzLnN1cGVyQ2xhc3MgPSBzdXBlckNsYXNzLnByb3RvdHlwZTtcblxuLy8gICAgIHJldHVybiBzdWJDbGFzcztcbi8vIH07XG4iLCIvKipcbiAqIEBmaWxlIOS4gOWghumhueebrumHjOmdouW4uOeUqOeahOaWueazlVxuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbmV4cG9ydHMuc2xpY2UgPSBmdW5jdGlvbiAoYXJyLCBzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyciwgc3RhcnQsIGVuZCk7XG59O1xuXG5leHBvcnRzLmdvRGFyayA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgbm9kZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIH1cbiAgICBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIG5vZGUuX190ZXh0X18gPSBub2RlLm5vZGVWYWx1ZTtcbiAgICAgICAgbm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICB9XG59O1xuXG5leHBvcnRzLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgbm9kZS5zdHlsZS5kaXNwbGF5ID0gbnVsbDtcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBpZiAobm9kZS5fX3RleHRfXyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBub2RlLm5vZGVWYWx1ZSA9IG5vZGUuX190ZXh0X187XG4gICAgICAgICAgICBub2RlLl9fdGV4dF9fID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0cy5jcmVhdGVFeHByRm4gPSBmdW5jdGlvbiAoZXhwclJlZ0V4cCwgZXhwciwgZXhwckNhbGN1bGF0ZXIpIHtcbiAgICBleHByID0gZXhwci5yZXBsYWNlKGV4cHJSZWdFeHAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1sxXTtcbiAgICB9KTtcbiAgICBleHByQ2FsY3VsYXRlci5jcmVhdGVFeHByRm4oZXhwcik7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGV4cHJDYWxjdWxhdGVyLmNhbGN1bGF0ZShleHByLCBmYWxzZSwgZGF0YSk7XG4gICAgfTtcbn07XG5cbi8qKlxuICog6LaF57qn566A5Y2V55qEIGV4dGVuZCDvvIzlm6DkuLrmnKzlupPlr7kgZXh0ZW5kIOayoemCo+mrmOeahOimgeaxgu+8jFxuICog562J5Yiw5pyJ6KaB5rGC55qE5pe25YCZ5YaN5a6M5ZaE44CCXG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0gIHtPYmplY3R9IHRhcmdldCDnm67moIflr7nosaFcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgIOacgOe7iOWQiOW5tuWQjueahOWvueixoVxuICovXG5leHBvcnRzLmV4dGVuZCA9IGZ1bmN0aW9uICh0YXJnZXQpIHtcbiAgICB2YXIgc3JjcyA9IGV4cG9ydHMuc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBzcmNzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgLyogZXNsaW50LWRpc2FibGUgZ3VhcmQtZm9yLWluICovXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzcmNzW2ldKSB7XG4gICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNyY3NbaV1ba2V5XTtcbiAgICAgICAgfVxuICAgICAgICAvKiBlc2xpbnQtZW5hYmxlIGd1YXJkLWZvci1pbiAqL1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufTtcblxuZXhwb3J0cy50cmF2ZXJzZU5vQ2hhbmdlTm9kZXMgPSBmdW5jdGlvbiAoc3RhcnROb2RlLCBlbmROb2RlLCBub2RlRm4sIGNvbnRleHQpIHtcbiAgICBmb3IgKHZhciBjdXJOb2RlID0gc3RhcnROb2RlO1xuICAgICAgICBjdXJOb2RlICYmIGN1ck5vZGUgIT09IGVuZE5vZGU7XG4gICAgICAgIGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nXG4gICAgKSB7XG4gICAgICAgIGlmIChub2RlRm4uY2FsbChjb250ZXh0LCBjdXJOb2RlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbm9kZUZuLmNhbGwoY29udGV4dCwgZW5kTm9kZSk7XG59O1xuXG5leHBvcnRzLnRyYXZlcnNlTm9kZXMgPSBmdW5jdGlvbiAoc3RhcnROb2RlLCBlbmROb2RlLCBub2RlRm4sIGNvbnRleHQpIHtcbiAgICB2YXIgbm9kZXMgPSBbXTtcbiAgICBmb3IgKHZhciBjdXJOb2RlID0gc3RhcnROb2RlO1xuICAgICAgICBjdXJOb2RlICYmIGN1ck5vZGUgIT09IGVuZE5vZGU7XG4gICAgICAgIGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nXG4gICAgKSB7XG4gICAgICAgIG5vZGVzLnB1c2goY3VyTm9kZSk7XG4gICAgfVxuXG4gICAgbm9kZXMucHVzaChlbmROb2RlKTtcblxuICAgIGV4cG9ydHMuZWFjaChub2Rlcywgbm9kZUZuLCBjb250ZXh0KTtcbn07XG5cbmV4cG9ydHMuZWFjaCA9IGZ1bmN0aW9uIChhcnIsIGZuLCBjb250ZXh0KSB7XG4gICAgaWYgKGV4cG9ydHMuaXNBcnJheShhcnIpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGFyci5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZm4uY2FsbChjb250ZXh0LCBhcnJbaV0sIGksIGFycikpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgYXJyID09PSAnb2JqZWN0Jykge1xuICAgICAgICBmb3IgKHZhciBrIGluIGFycikge1xuICAgICAgICAgICAgaWYgKGZuLmNhbGwoY29udGV4dCwgYXJyW2tdLCBrLCBhcnIpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5leHBvcnRzLmlzQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09PSAnb2JqZWN0IEFycmF5Jztcbn07XG4iLCJ3aW5kb3cuRXZlbnRFeHByUGFyc2VyID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuLi9zcmMvRXZlbnRFeHByUGFyc2VyLmpzJyk7Il19
