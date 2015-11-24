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

    return function (scopeModel) {
        return exprCalculater.calculate(expr, false, scopeModel);
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

function isClass(obj, clsName) {
    return Object.prototype.toString.call(obj) === '[object ' + clsName + ']';
}

exports.isArray = function (arr) {
    return isClass(arr, 'Array');
};

exports.isNumber = function (obj) {
    return isClass(obj, 'Number');
};

exports.isFunction = function (obj) {
    return isClass(obj, 'Function');
};

/**
 * 是否是一个纯对象，满足如下条件：
 *
 * 1、除了内置属性之外，没有其他继承属性；
 * 2、constructor 是 Object
 *
 * @param {Any} obj 待判断的变量
 * @return {boolean}
 */
exports.isPureObject = function (obj) {
    if (!isClass(obj, 'Object')) {
        return false;
    }

    for (var k in obj) {
        if (!obj.hasOwnProperty(k)) {
            return false;
        }
    }

    return true;
};

exports.isClass = isClass;

exports.bind = function (fn, thisArg) {
    if (!exports.isFunction(fn)) {
        return;
    }

    var bind = Function.prototype.bind || function () {
        var args = arguments;
        var obj = args.length > 0 ? args[0] : undefined;
        var me = this;
        return function () {
            var totalArgs = Array.prototype.concat.apply(Array.prototype.slice.call(args, 1), arguments);
            return me.apply(obj, totalArgs);
        };
    };
    return bind.apply(fn, [thisArg].concat(Array.prototype.slice.call(arguments, 2)));
};

exports.isSubClassOf = function (SubClass, SuperClass) {
    return SubClass.prototype instanceof SuperClass;
};

/**
 * 对传入的字符串进行创建正则表达式之前的转义，防止字符串中的一些字符成为关键字。
 *
 * @param  {string} str 待转义的字符串
 * @return {string}     转义之后的字符串
 */
exports.regExpEncode = function regExpEncode(str) {
    return '\\' + str.split('').join('\\');
};

exports.xhr = function (options, loadFn, errorFn) {
    options = exports.extend({
        method: 'GET'
    }, options);

    var xhr = new XMLHttpRequest();
    xhr.onerror = errorFn;
    xhr.onload = loadFn;
    xhr.open(options.method, options.url, true);
    setHeaders(options.headers, xhr);
    xhr.send(options.body);
};

function setHeaders(headers, xhr) {
    if (!headers) {
        return;
    }

    for (var k in headers) {
        if (!headers.hasOwnProperty(k)) {
            continue;
        }
        xhr.setRequestHeader(k, headers[k]);
    }
}


