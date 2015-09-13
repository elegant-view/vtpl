(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @file for 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var inherit = require('./inherit');
var Parser = require('./Parser');
var utils = require('./utils');

function ForDirectiveParser(options) {
    Parser.call(this, options);
}

ForDirectiveParser.prototype.initialize = function (options) {
    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;
    this.Tree = options.Tree;
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
    this.exprFn = utils.createExprFn(this.config.getExprRegExp(), this.expr);
    this.updateFn = createUpdateFn(
        this,
        this.Tree,
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
    if (this.dirtyCheck(this.expr, exprValue, this.exprOldValue)) {
        this.updateFn(exprValue, data);
    }

    this.exprOldValue = exprValue;
};

ForDirectiveParser.isForNode = function (node, config) {
    return node.nodeType === 8 && config.forPrefixRegExp.test(node.nodeValue);
};

ForDirectiveParser.isForEndNode = function (node, config) {
    return node.nodeType === 8 && config.forEndPrefixRegExp.test(node.nodeValue);
};

ForDirectiveParser.findForEnd = function (forStartNode, config) {
    var curNode = forStartNode;
    while ((curNode = curNode.nextSibling)) {
        if (ForDirectiveParser.isForEndNode(curNode, config)) {
            return curNode;
        }
    }
};

module.exports = inherit(ForDirectiveParser, Parser);

function createUpdateFn(parser, Tree, startNode, endNode, config, fullExpr) {
    var trees = [];
    var itemVariableName = fullExpr.match(parser.config.getForItemValueNameRegExp())[1];
    return function (exprValue, data) {
        var index = 0;
        for (var k in exprValue) {
            if (!trees[index]) {
                trees[index] = createTree(parser, Tree, config);
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

function createTree(parser, Tree, config) {
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
window.ForDirectiveParser = module.exports = require('../src/ForDirectiveParser.js');
},{"../src/ForDirectiveParser.js":1}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9Gb3JEaXJlY3RpdmVQYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvUGFyc2VyLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL2luaGVyaXQuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvdXRpbHMuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC90bXAvZmFrZV9mMzE2MDlkMy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAZmlsZSBmb3Ig5oyH5LukXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxudmFyIGluaGVyaXQgPSByZXF1aXJlKCcuL2luaGVyaXQnKTtcbnZhciBQYXJzZXIgPSByZXF1aXJlKCcuL1BhcnNlcicpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBGb3JEaXJlY3RpdmVQYXJzZXIob3B0aW9ucykge1xuICAgIFBhcnNlci5jYWxsKHRoaXMsIG9wdGlvbnMpO1xufVxuXG5Gb3JEaXJlY3RpdmVQYXJzZXIucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHRoaXMuc3RhcnROb2RlID0gb3B0aW9ucy5zdGFydE5vZGU7XG4gICAgdGhpcy5lbmROb2RlID0gb3B0aW9ucy5lbmROb2RlO1xuICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG4gICAgdGhpcy5UcmVlID0gb3B0aW9ucy5UcmVlO1xufTtcblxuRm9yRGlyZWN0aXZlUGFyc2VyLnByb3RvdHlwZS5jb2xsZWN0RXhwcnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuc3RhcnROb2RlLm5leHRTaWJsaW5nID09PSB0aGlzLmVuZE5vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciB0cGxTZWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB1dGlscy50cmF2ZXJzZU5vZGVzKHRoaXMuc3RhcnROb2RlLCB0aGlzLmVuZE5vZGUsIGZ1bmN0aW9uIChjdXJOb2RlKSB7XG4gICAgICAgIGlmIChjdXJOb2RlID09PSB0aGlzLnN0YXJ0Tm9kZSB8fCBjdXJOb2RlID09PSB0aGlzLmVuZE5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRwbFNlZy5hcHBlbmRDaGlsZChjdXJOb2RlKTtcbiAgICB9LCB0aGlzKTtcbiAgICB0aGlzLnRwbFNlZyA9IHRwbFNlZztcblxuICAgIHRoaXMuZXhwciA9IHRoaXMuc3RhcnROb2RlLm5vZGVWYWx1ZS5tYXRjaCh0aGlzLmNvbmZpZy5nZXRGb3JFeHByc1JlZ0V4cCgpKVsxXTtcbiAgICB0aGlzLmV4cHJGbiA9IHV0aWxzLmNyZWF0ZUV4cHJGbih0aGlzLmNvbmZpZy5nZXRFeHByUmVnRXhwKCksIHRoaXMuZXhwcik7XG4gICAgdGhpcy51cGRhdGVGbiA9IGNyZWF0ZVVwZGF0ZUZuKFxuICAgICAgICB0aGlzLFxuICAgICAgICB0aGlzLlRyZWUsXG4gICAgICAgIHRoaXMuc3RhcnROb2RlLm5leHRTaWJsaW5nLFxuICAgICAgICB0aGlzLmVuZE5vZGUucHJldmlvdXNTaWJsaW5nLFxuICAgICAgICB0aGlzLmNvbmZpZyxcbiAgICAgICAgdGhpcy5zdGFydE5vZGUubm9kZVZhbHVlXG4gICAgKTtcbn07XG5cbkZvckRpcmVjdGl2ZVBhcnNlci5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKCF0aGlzLmV4cHIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBleHByVmFsdWUgPSB0aGlzLmV4cHJGbihkYXRhKTtcbiAgICBpZiAodGhpcy5kaXJ0eUNoZWNrKHRoaXMuZXhwciwgZXhwclZhbHVlLCB0aGlzLmV4cHJPbGRWYWx1ZSkpIHtcbiAgICAgICAgdGhpcy51cGRhdGVGbihleHByVmFsdWUsIGRhdGEpO1xuICAgIH1cblxuICAgIHRoaXMuZXhwck9sZFZhbHVlID0gZXhwclZhbHVlO1xufTtcblxuRm9yRGlyZWN0aXZlUGFyc2VyLmlzRm9yTm9kZSA9IGZ1bmN0aW9uIChub2RlLCBjb25maWcpIHtcbiAgICByZXR1cm4gbm9kZS5ub2RlVHlwZSA9PT0gOCAmJiBjb25maWcuZm9yUHJlZml4UmVnRXhwLnRlc3Qobm9kZS5ub2RlVmFsdWUpO1xufTtcblxuRm9yRGlyZWN0aXZlUGFyc2VyLmlzRm9yRW5kTm9kZSA9IGZ1bmN0aW9uIChub2RlLCBjb25maWcpIHtcbiAgICByZXR1cm4gbm9kZS5ub2RlVHlwZSA9PT0gOCAmJiBjb25maWcuZm9yRW5kUHJlZml4UmVnRXhwLnRlc3Qobm9kZS5ub2RlVmFsdWUpO1xufTtcblxuRm9yRGlyZWN0aXZlUGFyc2VyLmZpbmRGb3JFbmQgPSBmdW5jdGlvbiAoZm9yU3RhcnROb2RlLCBjb25maWcpIHtcbiAgICB2YXIgY3VyTm9kZSA9IGZvclN0YXJ0Tm9kZTtcbiAgICB3aGlsZSAoKGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nKSkge1xuICAgICAgICBpZiAoRm9yRGlyZWN0aXZlUGFyc2VyLmlzRm9yRW5kTm9kZShjdXJOb2RlLCBjb25maWcpKSB7XG4gICAgICAgICAgICByZXR1cm4gY3VyTm9kZTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gaW5oZXJpdChGb3JEaXJlY3RpdmVQYXJzZXIsIFBhcnNlcik7XG5cbmZ1bmN0aW9uIGNyZWF0ZVVwZGF0ZUZuKHBhcnNlciwgVHJlZSwgc3RhcnROb2RlLCBlbmROb2RlLCBjb25maWcsIGZ1bGxFeHByKSB7XG4gICAgdmFyIHRyZWVzID0gW107XG4gICAgdmFyIGl0ZW1WYXJpYWJsZU5hbWUgPSBmdWxsRXhwci5tYXRjaChwYXJzZXIuY29uZmlnLmdldEZvckl0ZW1WYWx1ZU5hbWVSZWdFeHAoKSlbMV07XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChleHByVmFsdWUsIGRhdGEpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gMDtcbiAgICAgICAgZm9yICh2YXIgayBpbiBleHByVmFsdWUpIHtcbiAgICAgICAgICAgIGlmICghdHJlZXNbaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgdHJlZXNbaW5kZXhdID0gY3JlYXRlVHJlZShwYXJzZXIsIFRyZWUsIGNvbmZpZyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRyZWVzW2luZGV4XS5yZXN0b3JlRnJvbURhcmsoKTtcbiAgICAgICAgICAgIHRyZWVzW2luZGV4XS5zZXREaXJ0eUNoZWNrZXIocGFyc2VyLmRpcnR5Q2hlY2tlcik7XG5cbiAgICAgICAgICAgIHZhciBsb2NhbCA9IHtcbiAgICAgICAgICAgICAgICBrZXk6IGssXG4gICAgICAgICAgICAgICAgaW5kZXg6IGluZGV4XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgbG9jYWxbaXRlbVZhcmlhYmxlTmFtZV0gPSBleHByVmFsdWVba107XG4gICAgICAgICAgICB0cmVlc1tpbmRleF0uc2V0RGF0YSh1dGlscy5leHRlbmQoe30sIGRhdGEsIGxvY2FsKSk7XG5cbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBpID0gaW5kZXgsIGlsID0gdHJlZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgdHJlZXNbaV0uZ29EYXJrKCk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVUcmVlKHBhcnNlciwgVHJlZSwgY29uZmlnKSB7XG4gICAgdmFyIGNvcHlTZWcgPSBwYXJzZXIudHBsU2VnLmNsb25lTm9kZSh0cnVlKTtcbiAgICB2YXIgc3RhcnROb2RlID0gY29weVNlZy5maXJzdENoaWxkO1xuICAgIHZhciBlbmROb2RlID0gY29weVNlZy5sYXN0Q2hpbGQ7XG4gICAgdXRpbHMudHJhdmVyc2VOb2RlcyhzdGFydE5vZGUsIGVuZE5vZGUsIGZ1bmN0aW9uIChjdXJOb2RlKSB7XG4gICAgICAgIHBhcnNlci5lbmROb2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGN1ck5vZGUsIHBhcnNlci5lbmROb2RlKTtcbiAgICB9KTtcblxuICAgIHZhciB0cmVlID0gbmV3IFRyZWUoe1xuICAgICAgICBzdGFydE5vZGU6IHN0YXJ0Tm9kZSxcbiAgICAgICAgZW5kTm9kZTogZW5kTm9kZSxcbiAgICAgICAgY29uZmlnOiBjb25maWdcbiAgICB9KTtcbiAgICB0cmVlLnRyYXZlcnNlKCk7XG4gICAgcmV0dXJuIHRyZWU7XG59XG4iLCIvKipcbiAqIEBmaWxlIOino+aekOWZqOeahOaKveixoeWfuuexu1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbi8qKlxuICog5p6E6YCg5Ye95pWwXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDphY3nva7lj4LmlbDvvIzkuIDoiKzlj6/og73kvJrmnInlpoLkuIvlhoXlrrnvvJpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydE5vZGU6IC4uLixcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmROb2RlOiAuLi4sXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogLi4uLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZzogLi4uXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICDlhbfkvZPmmK/llaXlj6/ku6Xlj4LliqDlhbfkvZPnmoTlrZDnsbtcbiAqL1xuZnVuY3Rpb24gUGFyc2VyKG9wdGlvbnMpIHtcbiAgICB0aGlzLmluaXRpYWxpemUob3B0aW9ucyk7XG59XG5cbi8qKlxuICog5Yid5aeL5YyWXG4gKlxuICogQHByb3RlY3RlZFxuICogQGFic3RyYWN0XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDmnaXoh6rkuo7mnoTpgKDlh73mlbBcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHt9O1xuXG4vKipcbiAqIOmUgOavgeino+aekOWZqFxuICpcbiAqIEBwdWJsaWNcbiAqIEBhYnN0cmFjdFxuICovXG5QYXJzZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDorr7nva7mlbDmja5cbiAqXG4gKiBAcHVibGljXG4gKiBAYWJzdHJhY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIOimgeiuvue9rueahOaVsOaNrlxuICovXG5QYXJzZXIucHJvdG90eXBlLnNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge307XG5cbi8qKlxuICog6ZqQ6JeP55u45YWz5YWD57SgXG4gKlxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vKipcbiAqIOaYvuekuuebuOWFs+WFg+e0oFxuICpcbiAqIEBwdWJsaWNcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDmkJzpm4booajovr7lvI/vvIznlJ/miJDooajovr7lvI/lh73mlbDlkowgRE9NIOabtOaWsOWHveaVsFxuICpcbiAqIEBhYnN0cmFjdFxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHt9O1xuXG5QYXJzZXIucHJvdG90eXBlLmRpcnR5Q2hlY2sgPSBmdW5jdGlvbiAoZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWUpIHtcbiAgICB2YXIgZGlydHlDaGVja2VyRm4gPSB0aGlzLmRpcnR5Q2hlY2tlciA/IHRoaXMuZGlydHlDaGVja2VyLmdldENoZWNrZXIoZXhwcikgOiBudWxsO1xuICAgIHJldHVybiAoZGlydHlDaGVja2VyRm4gJiYgZGlydHlDaGVja2VyRm4oZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWUpKVxuICAgICAgICAgICAgfHwgKCFkaXJ0eUNoZWNrZXJGbiAmJiBleHByVmFsdWUgIT09IGV4cHJPbGRWYWx1ZSk7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLnNldERpcnR5Q2hlY2tlciA9IGZ1bmN0aW9uIChkaXJ0eUNoZWNrZXIpIHtcbiAgICB0aGlzLmRpcnR5Q2hlY2tlciA9IGRpcnR5Q2hlY2tlcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGFyc2VyO1xuIiwiLyoqXG4gKiBAZmlsZSDnu6fmib9cbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG5mdW5jdGlvbiBpbmhlcml0KENoaWxkQ2xhc3MsIFBhcmVudENsYXNzKSB7XG4gICAgdmFyIGNoaWxkUHJvdG8gPSBDaGlsZENsYXNzLnByb3RvdHlwZTtcbiAgICBDaGlsZENsYXNzLnByb3RvdHlwZSA9IG5ldyBQYXJlbnRDbGFzcyh7fSk7XG4gICAgZm9yICh2YXIga2V5IGluIGNoaWxkUHJvdG8pIHtcbiAgICAgICAgaWYgKGNoaWxkUHJvdG8uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgQ2hpbGRDbGFzcy5wcm90b3R5cGVba2V5XSA9IGNoaWxkUHJvdG9ba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gQ2hpbGRDbGFzcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0O1xuXG4vLyBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdWJDbGFzcywgc3VwZXJDbGFzcykge1xuLy8gICAgIHZhciBFbXB0eSA9IGZ1bmN0aW9uICgpIHt9O1xuLy8gICAgIEVtcHR5LnByb3RvdHlwZSA9IHN1cGVyQ2xhc3MucHJvdG90eXBlO1xuLy8gICAgIHZhciBzZWxmUHJvdG90eXBlID0gc3ViQ2xhc3MucHJvdG90eXBlO1xuLy8gICAgIHZhciBwcm90byA9IHN1YkNsYXNzLnByb3RvdHlwZSA9IG5ldyBFbXB0eSgpO1xuXG4vLyAgICAgZm9yICh2YXIga2V5IGluIHNlbGZQcm90b3R5cGUpIHtcbi8vICAgICAgICAgcHJvdG9ba2V5XSA9IHNlbGZQcm90b3R5cGVba2V5XTtcbi8vICAgICB9XG4vLyAgICAgc3ViQ2xhc3MucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gc3ViQ2xhc3M7XG4vLyAgICAgc3ViQ2xhc3Muc3VwZXJDbGFzcyA9IHN1cGVyQ2xhc3MucHJvdG90eXBlO1xuXG4vLyAgICAgcmV0dXJuIHN1YkNsYXNzO1xuLy8gfTtcbiIsIi8qKlxuICogQGZpbGUg5LiA5aCG6aG555uu6YeM6Z2i5bi455So55qE5pa55rOVXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxuZXhwb3J0cy5zbGljZSA9IGZ1bmN0aW9uIChhcnIsIHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyLCBzdGFydCwgZW5kKTtcbn07XG5cbi8qKlxuICog6K6h566X6KGo6L6+5byP55qE5YC8XG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV4cHJlc3Npb24g6KGo6L6+5byP5a2X56ym5Liy77yM57G75Ly85LqOIGAke25hbWV9YCDkuK3nmoQgbmFtZVxuICogQHBhcmFtICB7T2JqZWN0fSBjdXJEYXRhICAgIOW9k+WJjeihqOi+vuW8j+WvueW6lOeahOaVsOaNrlxuICogQHJldHVybiB7c3RyaW5nfSAgICAgICAgICAgIOiuoeeul+e7k+aenFxuICovXG5leHBvcnRzLmNhbGN1bGF0ZUV4cHJlc3Npb24gPSBmdW5jdGlvbiAoZXhwcmVzc2lvbiwgY3VyRGF0YSkge1xuICAgIHZhciBwYXJhbXMgPSBnZXRWYXJpYWJsZU5hbWVzRnJvbUV4cHIoZXhwcmVzc2lvbik7XG5cbiAgICB2YXIgZm5BcmdzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gcGFyYW1zLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcmFtID0gcGFyYW1zW2ldO1xuICAgICAgICB2YXIgdmFsdWUgPSBjdXJEYXRhW3BhcmFtXTtcbiAgICAgICAgZm5BcmdzLnB1c2godmFsdWUgPT09IHVuZGVmaW5lZCA/ICcnIDogdmFsdWUpO1xuICAgIH1cblxuICAgIHZhciByZXN1bHQ7XG4gICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gKG5ldyBGdW5jdGlvbihwYXJhbXMsICdyZXR1cm4gJyArIGV4cHJlc3Npb24pKS5hcHBseShudWxsLCBmbkFyZ3MpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICByZXN1bHQgPSAnJztcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuZXhwb3J0cy5nb0RhcmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBub2RlLl9fdGV4dF9fID0gbm9kZS5ub2RlVmFsdWU7XG4gICAgICAgIG5vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgfVxufTtcblxuZXhwb3J0cy5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgaWYgKG5vZGUuX190ZXh0X18gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbm9kZS5ub2RlVmFsdWUgPSBub2RlLl9fdGV4dF9fO1xuICAgICAgICAgICAgbm9kZS5fX3RleHRfXyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmV4cG9ydHMuY3JlYXRlRXhwckZuID0gZnVuY3Rpb24gKGV4cHJSZWdFeHAsIGV4cHIpIHtcbiAgICBleHByID0gZXhwci5yZXBsYWNlKGV4cHJSZWdFeHAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1sxXTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICByZXR1cm4gZXhwb3J0cy5jYWxjdWxhdGVFeHByZXNzaW9uKGV4cHIsIGRhdGEpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIOi2hee6p+eugOWNleeahCBleHRlbmQg77yM5Zug5Li65pys5bqT5a+5IGV4dGVuZCDmsqHpgqPpq5jnmoTopoHmsYLvvIxcbiAqIOetieWIsOacieimgeaxgueahOaXtuWAmeWGjeWujOWWhOOAglxuICpcbiAqIEBpbm5lclxuICogQHBhcmFtICB7T2JqZWN0fSB0YXJnZXQg55uu5qCH5a+56LGhXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICDmnIDnu4jlkIjlubblkI7nmoTlr7nosaFcbiAqL1xuZXhwb3J0cy5leHRlbmQgPSBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gICAgdmFyIHNyY3MgPSBleHBvcnRzLnNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gc3Jjcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIC8qIGVzbGludC1kaXNhYmxlIGd1YXJkLWZvci1pbiAqL1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3Jjc1tpXSkge1xuICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzcmNzW2ldW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgLyogZXNsaW50LWVuYWJsZSBndWFyZC1mb3ItaW4gKi9cbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn07XG5cbmV4cG9ydHMudHJhdmVyc2VOb0NoYW5nZU5vZGVzID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgbm9kZUZuLCBjb250ZXh0KSB7XG4gICAgZm9yICh2YXIgY3VyTm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICAgICAgY3VyTm9kZSAmJiBjdXJOb2RlICE9PSBlbmROb2RlO1xuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZ1xuICAgICkge1xuICAgICAgICBpZiAobm9kZUZuLmNhbGwoY29udGV4dCwgY3VyTm9kZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5vZGVGbi5jYWxsKGNvbnRleHQsIGVuZE5vZGUpO1xufTtcblxuZXhwb3J0cy50cmF2ZXJzZU5vZGVzID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgbm9kZUZuLCBjb250ZXh0KSB7XG4gICAgdmFyIG5vZGVzID0gW107XG4gICAgZm9yICh2YXIgY3VyTm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICAgICAgY3VyTm9kZSAmJiBjdXJOb2RlICE9PSBlbmROb2RlO1xuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZ1xuICAgICkge1xuICAgICAgICBub2Rlcy5wdXNoKGN1ck5vZGUpO1xuICAgIH1cblxuICAgIG5vZGVzLnB1c2goZW5kTm9kZSk7XG5cbiAgICBleHBvcnRzLmVhY2gobm9kZXMsIG5vZGVGbiwgY29udGV4dCk7XG59O1xuXG5leHBvcnRzLmVhY2ggPSBmdW5jdGlvbiAoYXJyLCBmbiwgY29udGV4dCkge1xuICAgIGlmIChleHBvcnRzLmlzQXJyYXkoYXJyKSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBhcnIubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgaWYgKGZuLmNhbGwoY29udGV4dCwgYXJyW2ldLCBpLCBhcnIpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGFyciA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBhcnIpIHtcbiAgICAgICAgICAgIGlmIChmbi5jYWxsKGNvbnRleHQsIGFycltrXSwgaywgYXJyKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0cy5pc0FycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PT0gJ29iamVjdCBBcnJheSc7XG59O1xuXG4vKipcbiAqIOS7juihqOi+vuW8j+S4reaKveemu+WHuuWPmOmHj+WQjVxuICpcbiAqIEBpbm5lclxuICogQHBhcmFtICB7c3RyaW5nfSBleHByIOihqOi+vuW8j+Wtl+espuS4su+8jOexu+S8vOS6jiBgJHtuYW1lfWAg5Lit55qEIG5hbWVcbiAqIEByZXR1cm4ge0FycmF5LjxzdHJpbmc+fSAgICAgIOWPmOmHj+WQjeaVsOe7hFxuICovXG52YXIgZXhwck5hbWVNYXAgPSB7fTtcbnZhciBleHByTmFtZVJlZ0V4cCA9IC9cXC4/XFwkPyhbYS16fEEtWl0rfChbYS16fEEtWl0rWzAtOV0rW2EtenxBLVpdKikpL2c7XG5mdW5jdGlvbiBnZXRWYXJpYWJsZU5hbWVzRnJvbUV4cHIoZXhwcikge1xuICAgIGlmIChleHByTmFtZU1hcFtleHByXSkge1xuICAgICAgICByZXR1cm4gZXhwck5hbWVNYXBbZXhwcl07XG4gICAgfVxuXG4gICAgdmFyIG1hdGNoZXMgPSBleHByLm1hdGNoKGV4cHJOYW1lUmVnRXhwKSB8fCBbXTtcbiAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBtYXRjaGVzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgaWYgKG1hdGNoZXNbaV0gJiYgbWF0Y2hlc1tpXVswXSAhPT0gJy4nKSB7XG4gICAgICAgICAgICBuYW1lcy5wdXNoKG1hdGNoZXNbaV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZXhwck5hbWVNYXBbZXhwcl0gPSBuYW1lcztcblxuICAgIHJldHVybiBuYW1lcztcbn1cbiIsIndpbmRvdy5Gb3JEaXJlY3RpdmVQYXJzZXIgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4uL3NyYy9Gb3JEaXJlY3RpdmVQYXJzZXIuanMnKTsiXX0=
