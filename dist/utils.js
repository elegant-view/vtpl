(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
        for (var key in srcs[i]) {
            target[key] = srcs[i][key];
        }
    }
    return target;
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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9mYWtlXzllZjk3YmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJleHBvcnRzLnNsaWNlID0gZnVuY3Rpb24gKGFyciwgc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnIsIHN0YXJ0LCBlbmQpO1xufTtcblxuLyoqXG4gKiDorqHnrpfooajovr7lvI/nmoTlgLxcbiAqXG4gKiBAaW5uZXJcbiAqIEBwYXJhbSAge3N0cmluZ30gZXhwcmVzc2lvbiDooajovr7lvI/lrZfnrKbkuLLvvIznsbvkvLzkuo4gYCR7bmFtZX1gIOS4reeahCBuYW1lXG4gKiBAcGFyYW0gIHtPYmplY3R9IGN1ckRhdGEgICAg5b2T5YmN6KGo6L6+5byP5a+55bqU55qE5pWw5o2uXG4gKiBAcmV0dXJuIHtzdHJpbmd9ICAgICAgICAgICAg6K6h566X57uT5p6cXG4gKi9cbmV4cG9ydHMuY2FsY3VsYXRlRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChleHByZXNzaW9uLCBjdXJEYXRhKSB7XG4gICAgdmFyIHBhcmFtcyA9IGdldFZhcmlhYmxlTmFtZXNGcm9tRXhwcihleHByZXNzaW9uKTtcblxuICAgIHZhciBmbkFyZ3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBwYXJhbXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICB2YXIgcGFyYW0gPSBwYXJhbXNbaV07XG4gICAgICAgIHZhciB2YWx1ZSA9IGN1ckRhdGFbcGFyYW1dO1xuICAgICAgICBmbkFyZ3MucHVzaCh2YWx1ZSA9PT0gdW5kZWZpbmVkID8gJycgOiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdDtcbiAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSAobmV3IEZ1bmN0aW9uKHBhcmFtcywgJ3JldHVybiAnICsgZXhwcmVzc2lvbikpLmFwcGx5KG51bGwsIGZuQXJncyk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIHJlc3VsdCA9ICcnO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5leHBvcnRzLmdvRGFyayA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgbm9kZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIH1cbiAgICBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIG5vZGUuX190ZXh0X18gPSBub2RlLm5vZGVWYWx1ZTtcbiAgICAgICAgbm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICB9XG59O1xuXG5leHBvcnRzLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgbm9kZS5zdHlsZS5kaXNwbGF5ID0gbnVsbDtcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBpZiAobm9kZS5fX3RleHRfXyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBub2RlLm5vZGVWYWx1ZSA9IG5vZGUuX190ZXh0X187XG4gICAgICAgICAgICBub2RlLl9fdGV4dF9fID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0cy5jcmVhdGVFeHByRm4gPSBmdW5jdGlvbiAoZXhwclJlZ0V4cCwgZXhwcikge1xuICAgIGV4cHIgPSBleHByLnJlcGxhY2UoZXhwclJlZ0V4cCwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gYXJndW1lbnRzWzFdO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJldHVybiBleHBvcnRzLmNhbGN1bGF0ZUV4cHJlc3Npb24oZXhwciwgZGF0YSk7XG4gICAgfTtcbn07XG5cbi8qKlxuICog6LaF57qn566A5Y2V55qEIGV4dGVuZCDvvIzlm6DkuLrmnKzlupPlr7kgZXh0ZW5kIOayoemCo+mrmOeahOimgeaxgu+8jFxuICog562J5Yiw5pyJ6KaB5rGC55qE5pe25YCZ5YaN5a6M5ZaE44CCXG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0gIHtPYmplY3R9IHRhcmdldCDnm67moIflr7nosaFcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgIOacgOe7iOWQiOW5tuWQjueahOWvueixoVxuICovXG5leHBvcnRzLmV4dGVuZCA9IGZ1bmN0aW9uICh0YXJnZXQpIHtcbiAgICB2YXIgc3JjcyA9IGV4cG9ydHMuc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBzcmNzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNyY3NbaV0pIHtcbiAgICAgICAgICAgIHRhcmdldFtrZXldID0gc3Jjc1tpXVtrZXldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59O1xuXG5leHBvcnRzLnRyYXZlcnNlTm9kZXMgPSBmdW5jdGlvbiAoc3RhcnROb2RlLCBlbmROb2RlLCBub2RlRm4sIGNvbnRleHQpIHtcbiAgICB2YXIgbm9kZXMgPSBbXTtcbiAgICBmb3IgKHZhciBjdXJOb2RlID0gc3RhcnROb2RlO1xuICAgICAgICBjdXJOb2RlICYmIGN1ck5vZGUgIT09IGVuZE5vZGU7XG4gICAgICAgIGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nXG4gICAgKSB7XG4gICAgICAgIG5vZGVzLnB1c2goY3VyTm9kZSk7XG4gICAgfVxuXG4gICAgbm9kZXMucHVzaChlbmROb2RlKTtcblxuICAgIGV4cG9ydHMuZWFjaChub2Rlcywgbm9kZUZuLCBjb250ZXh0KTtcbn07XG5cbmV4cG9ydHMuZWFjaCA9IGZ1bmN0aW9uIChhcnIsIGZuLCBjb250ZXh0KSB7XG4gICAgaWYgKGV4cG9ydHMuaXNBcnJheShhcnIpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGFyci5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZm4uY2FsbChjb250ZXh0LCBhcnJbaV0sIGksIGFycikpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgYXJyID09PSAnb2JqZWN0Jykge1xuICAgICAgICBmb3IgKHZhciBrIGluIGFycikge1xuICAgICAgICAgICAgaWYgKGZuLmNhbGwoY29udGV4dCwgYXJyW2tdLCBrLCBhcnIpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5leHBvcnRzLmlzQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09PSAnb2JqZWN0IEFycmF5Jztcbn07XG5cbi8qKlxuICog5LuO6KGo6L6+5byP5Lit5oq956a75Ye65Y+Y6YeP5ZCNXG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV4cHIg6KGo6L6+5byP5a2X56ym5Liy77yM57G75Ly85LqOIGAke25hbWV9YCDkuK3nmoQgbmFtZVxuICogQHJldHVybiB7QXJyYXkuPHN0cmluZz59ICAgICAg5Y+Y6YeP5ZCN5pWw57uEXG4gKi9cbnZhciBleHByTmFtZU1hcCA9IHt9O1xudmFyIGV4cHJOYW1lUmVnRXhwID0gL1xcLj9cXCQ/KFthLXp8QS1aXSt8KFthLXp8QS1aXStbMC05XStbYS16fEEtWl0qKSkvZztcbmZ1bmN0aW9uIGdldFZhcmlhYmxlTmFtZXNGcm9tRXhwcihleHByKSB7XG4gICAgaWYgKGV4cHJOYW1lTWFwW2V4cHJdKSB7XG4gICAgICAgIHJldHVybiBleHByTmFtZU1hcFtleHByXTtcbiAgICB9XG5cbiAgICB2YXIgbWF0Y2hlcyA9IGV4cHIubWF0Y2goZXhwck5hbWVSZWdFeHApIHx8IFtdO1xuICAgIHZhciBuYW1lcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IG1hdGNoZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICBpZiAobWF0Y2hlc1tpXSAmJiBtYXRjaGVzW2ldWzBdICE9PSAnLicpIHtcbiAgICAgICAgICAgIG5hbWVzLnB1c2gobWF0Y2hlc1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBleHByTmFtZU1hcFtleHByXSA9IG5hbWVzO1xuXG4gICAgcmV0dXJuIG5hbWVzO1xufVxuIl19
