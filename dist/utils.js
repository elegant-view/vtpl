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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9mYWtlX2QwNWUyMzVmLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZXhwb3J0cy5zbGljZSA9IGZ1bmN0aW9uIChhcnIsIHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyLCBzdGFydCwgZW5kKTtcbn07XG5cbi8qKlxuICog6K6h566X6KGo6L6+5byP55qE5YC8XG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV4cHJlc3Npb24g6KGo6L6+5byP5a2X56ym5Liy77yM57G75Ly85LqOIGAke25hbWV9YCDkuK3nmoQgbmFtZVxuICogQHBhcmFtICB7T2JqZWN0fSBjdXJEYXRhICAgIOW9k+WJjeihqOi+vuW8j+WvueW6lOeahOaVsOaNrlxuICogQHJldHVybiB7c3RyaW5nfSAgICAgICAgICAgIOiuoeeul+e7k+aenFxuICovXG5leHBvcnRzLmNhbGN1bGF0ZUV4cHJlc3Npb24gPSBmdW5jdGlvbiAoZXhwcmVzc2lvbiwgY3VyRGF0YSkge1xuICAgIHZhciBwYXJhbXMgPSBnZXRWYXJpYWJsZU5hbWVzRnJvbUV4cHIoZXhwcmVzc2lvbik7XG5cbiAgICB2YXIgZm5BcmdzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gcGFyYW1zLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcmFtID0gcGFyYW1zW2ldO1xuICAgICAgICB2YXIgdmFsdWUgPSBjdXJEYXRhW3BhcmFtXTtcbiAgICAgICAgZm5BcmdzLnB1c2godmFsdWUgPT09IHVuZGVmaW5lZCA/ICcnIDogdmFsdWUpO1xuICAgIH1cblxuICAgIHZhciByZXN1bHQ7XG4gICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gKG5ldyBGdW5jdGlvbihwYXJhbXMsICdyZXR1cm4gJyArIGV4cHJlc3Npb24pKS5hcHBseShudWxsLCBmbkFyZ3MpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICByZXN1bHQgPSAnJztcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuZXhwb3J0cy5nb0RhcmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBub2RlLl9fdGV4dF9fID0gbm9kZS5ub2RlVmFsdWU7XG4gICAgICAgIG5vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgfVxufTtcblxuZXhwb3J0cy5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgaWYgKG5vZGUuX190ZXh0X18gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbm9kZS5ub2RlVmFsdWUgPSBub2RlLl9fdGV4dF9fO1xuICAgICAgICAgICAgbm9kZS5fX3RleHRfXyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmV4cG9ydHMuY3JlYXRlRXhwckZuID0gZnVuY3Rpb24gKGV4cHJSZWdFeHAsIGV4cHIpIHtcbiAgICBleHByID0gZXhwci5yZXBsYWNlKGV4cHJSZWdFeHAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1sxXTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICByZXR1cm4gZXhwb3J0cy5jYWxjdWxhdGVFeHByZXNzaW9uKGV4cHIsIGRhdGEpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIOi2hee6p+eugOWNleeahCBleHRlbmQg77yM5Zug5Li65pys5bqT5a+5IGV4dGVuZCDmsqHpgqPpq5jnmoTopoHmsYLvvIxcbiAqIOetieWIsOacieimgeaxgueahOaXtuWAmeWGjeWujOWWhOOAglxuICpcbiAqIEBpbm5lclxuICogQHBhcmFtICB7T2JqZWN0fSB0YXJnZXQg55uu5qCH5a+56LGhXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICDmnIDnu4jlkIjlubblkI7nmoTlr7nosaFcbiAqL1xuZXhwb3J0cy5leHRlbmQgPSBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gICAgdmFyIHNyY3MgPSBleHBvcnRzLnNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gc3Jjcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzcmNzW2ldKSB7XG4gICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNyY3NbaV1ba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufTtcblxuZXhwb3J0cy50cmF2ZXJzZU5vZGVzID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgbm9kZUZuLCBjb250ZXh0KSB7XG4gICAgdmFyIG5vZGVzID0gW107XG4gICAgZm9yICh2YXIgY3VyTm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICAgICAgY3VyTm9kZSAmJiBjdXJOb2RlICE9PSBlbmROb2RlO1xuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZ1xuICAgICkge1xuICAgICAgICBub2Rlcy5wdXNoKGN1ck5vZGUpO1xuICAgIH1cblxuICAgIG5vZGVzLnB1c2goZW5kTm9kZSk7XG5cbiAgICBleHBvcnRzLmVhY2gobm9kZXMsIG5vZGVGbiwgY29udGV4dCk7XG59O1xuXG5leHBvcnRzLmVhY2ggPSBmdW5jdGlvbiAoYXJyLCBmbiwgY29udGV4dCkge1xuICAgIGlmIChleHBvcnRzLmlzQXJyYXkoYXJyKSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBhcnIubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgaWYgKGZuLmNhbGwoY29udGV4dCwgYXJyW2ldLCBpLCBhcnIpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGFyciA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBhcnIpIHtcbiAgICAgICAgICAgIGlmIChmbi5jYWxsKGNvbnRleHQsIGFycltrXSwgaywgYXJyKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0cy5pc0FycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PT0gJ29iamVjdCBBcnJheSc7XG59O1xuXG4vKipcbiAqIOS7juihqOi+vuW8j+S4reaKveemu+WHuuWPmOmHj+WQjVxuICpcbiAqIEBpbm5lclxuICogQHBhcmFtICB7c3RyaW5nfSBleHByIOihqOi+vuW8j+Wtl+espuS4su+8jOexu+S8vOS6jiBgJHtuYW1lfWAg5Lit55qEIG5hbWVcbiAqIEByZXR1cm4ge0FycmF5LjxzdHJpbmc+fSAgICAgIOWPmOmHj+WQjeaVsOe7hFxuICovXG52YXIgZXhwck5hbWVNYXAgPSB7fTtcbnZhciBleHByTmFtZVJlZ0V4cCA9IC9cXC4/XFwkPyhbYS16fEEtWl0rfChbYS16fEEtWl0rWzAtOV0rW2EtenxBLVpdKikpL2c7XG5mdW5jdGlvbiBnZXRWYXJpYWJsZU5hbWVzRnJvbUV4cHIoZXhwcikge1xuICAgIGlmIChleHByTmFtZU1hcFtleHByXSkge1xuICAgICAgICByZXR1cm4gZXhwck5hbWVNYXBbZXhwcl07XG4gICAgfVxuXG4gICAgdmFyIG1hdGNoZXMgPSBleHByLm1hdGNoKGV4cHJOYW1lUmVnRXhwKSB8fCBbXTtcbiAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBtYXRjaGVzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgaWYgKG1hdGNoZXNbaV0gJiYgbWF0Y2hlc1tpXVswXSAhPT0gJy4nKSB7XG4gICAgICAgICAgICBuYW1lcy5wdXNoKG1hdGNoZXNbaV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZXhwck5hbWVNYXBbZXhwcl0gPSBuYW1lcztcblxuICAgIHJldHVybiBuYW1lcztcbn1cbiJdfQ==
