(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @file 配置
 * @author yibuyisheng(yibuyisheng@163.com)
 */

function Config() {
    this.exprPrefix = '${';
    this.exprSuffix = '}';

    this.ifName = 'if';
    this.elifName = 'elif';
    this.elseName = 'else';
    this.ifEndName = '/if';

    this.ifPrefixRegExp = /^\s*if:\s*/;
    this.elifPrefixRegExp = /^\s*elif:\s*/;
    this.elsePrefixRegExp = /^\s*else\s*/;
    this.ifEndPrefixRegExp = /^\s*\/if\s*/;

    this.forName = 'for';
    this.forEndName = '/for';

    this.forPrefixRegExp = /^\s*for:\s*/;
    this.forEndPrefixRegExp = /^\s*\/for\s*/;
}

Config.prototype.setExprPrefix = function (prefix) {
    this.exprPrefix = prefix;
};

Config.prototype.setExprSuffix = function (suffix) {
    this.exprSuffix = suffix;
};

Config.prototype.getExprRegExp = function () {
    if (!this.exprRegExp) {
        this.exprRegExp = new RegExp(regExpEncode(this.exprPrefix) + '(.+)' + regExpEncode(this.exprSuffix), 'g');
    }
    return this.exprRegExp;
};

Config.prototype.getAllIfRegExp = function () {
    if (!this.allIfRegExp) {
        this.allIfRegExp = new RegExp('\\s*('
            + this.ifName + '|'
            + this.elifName + '|'
            + this.elseName + '|'
            + this.ifEndName + '):\\s*', 'g');
    }
    return this.allIfRegExp;
};

Config.prototype.setIfName = function (ifName) {
    this.ifName = ifName;
    this.ifPrefixRegExp = new RegExp('^\\s*' + ifName + ':\\s*');
};

Config.prototype.setElifName = function (elifName) {
    this.elifName = elifName;
    this.elifPrefixRegExp = new RegExp('^\\s*' + elifName + ':\\s*');
};

Config.prototype.setElseName = function (elseName) {
    this.elseName = elseName;
    this.elsePrefixRegExp = new RegExp('^\\s*' + elseName + '\\s*');
};

Config.prototype.setIfEndName = function (ifEndName) {
    this.ifEndName = ifEndName;
    this.ifEndPrefixRegExp = new RegExp('^\\s*' + ifEndName + '\\s*');
};

Config.prototype.setForName = function (forName) {
    this.forName = forName;
    this.forPrefixRegExp = new RegExp('^\\s*' + forName + ':\\s*');
};

Config.prototype.setForEndName = function (forEndName) {
    this.forEndName = forEndName;
    this.forEndPrefixRegExp = new RegExp('^\\s*' + forEndName + '\\s*');
};

Config.prototype.getForExprsRegExp = function () {
    if (!this.forExprsRegExp) {
        this.forExprsRegExp = new RegExp('\\s*'
            + this.forName
            + ':\\s*'
            + regExpEncode(this.exprPrefix)
            + '([^' + regExpEncode(this.exprSuffix)
            + ']+)' + regExpEncode(this.exprSuffix));
    }
    return this.forExprsRegExp;
};

Config.prototype.getForItemValueNameRegExp = function () {
    if (!this.forItemValueNameRegExp) {
        this.forItemValueNameRegExp = new RegExp(
            'as\\s*' + regExpEncode(this.exprPrefix)
            + '([^' + regExpEncode(this.exprSuffix) + ']+)'
            + regExpEncode(this.exprSuffix)
        );
    }
    return this.forItemValueNameRegExp;
};

module.exports = Config;

function regExpEncode(str) {
    return '\\' + str.split('').join('\\');
}

},{}],2:[function(require,module,exports){
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

ExprParser.prototype.collectExprs = function () {
    var curNode = this.node;

    // 文本节点
    if (curNode.nodeType === 3) {
        addExpr(this, curNode.nodeValue, (function (curNode) {
            return function (exprValue) {
                curNode.nodeValue = exprValue;
            };
        })(curNode));
    }
    // 元素节点
    else if (curNode.nodeType === 1) {
        var attributes = curNode.attributes;
        for (var i = 0, il = attributes.length; i < il; i++) {
            var attr = attributes[i];
            addExpr(this, attr.value, createAttrUpdateFn(attr));
        }
    }

    function createAttrUpdateFn(attr) {
        return function (exprValue) {
            attr.value = exprValue;
        };
    }
};

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

ExprParser.prototype.goDark = function () {
    utils.goDark(this.node);
};

ExprParser.prototype.restoreFromDark = function () {
    utils.restoreFromDark(this.node);
};


module.exports = inherit(ExprParser, Parser);

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
function inherit(ChildClass, ParentClass) {
    var childProto = ChildClass.prototype;
    ChildClass.prototype = new ParentClass();
    for (var key in childProto) {
        if (childProto.hasOwnProperty(key)) {
            ChildClass.prototype[key] = childProto[key];
        }
    }
    return ChildClass;
}

module.exports = inherit;
},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
var Config = require('../../src/Config');
var ExprParser = require('../../src/ExprParser');

describe('ExprParser', function () {
    var config;
    var testNode;

    beforeAll(function () {
        config = new Config();
        testNode = document.getElementById('test');
    });

    afterEach(function () {
        testNode.innerHTML = '';
    });

    it('${name}', function () {
        testNode.innerHTML = '${name}';

        var parser = createParser(testNode.firstChild);

        parser.setData({name: 'zhangsan'});
        expect(testNode.innerText).toEqual('zhangsan');

        parser.setData({});
        expect(testNode.innerText).toEqual('');

        parser.setData({name: '李四'});
        expect(testNode.innerText).toEqual('李四');
    });

    it('${student.name}', function () {
        testNode.innerText = '${student.name}';

        var parser = createParser(testNode.firstChild);

        parser.setData({student: {name: '张三'}});
        expect(testNode.innerText).toEqual('张三');

        parser.setData({student: null});
        expect(testNode.innerText).toEqual('');
    });

    it('${10 - num}', function () {
        testNode.innerHTML = '${10 - num}';

        var parser = createParser(testNode.firstChild);

        parser.setData({num: 8});
        expect(testNode.innerText).toEqual('2');

        parser.setData({num: 'aaa'});
        expect(testNode.innerText).toEqual('NaN');
    });

    it('${3-1}', function () {
        testNode.innerHTML = '${3-1}';

        var parser = createParser(testNode.firstChild);

        parser.setData({});
        expect(testNode.innerText).toEqual('2');
    });

    it('${getSex(sex)}', function () {
        testNode.innerHTML = '${getSex(sex)}';

        var parser = createParser(testNode.firstChild);

        var data = {
            getSex: function (sex) {
                if (sex === 1) {
                    return '男';
                }
                if (sex === 0) {
                    return '女';
                }
                return '未知性别';
            },
            sex: 1
        };

        parser.setData(data);
        expect(testNode.innerText).toEqual('男');

        data.sex = 0;
        parser.setData(data);
        expect(testNode.innerText).toEqual('女');

        data.sex = null;
        parser.setData(data);
        expect(testNode.innerText).toEqual('未知性别');
    });

    function createParser(node) {
        var parser = new ExprParser({
            node: node,
            config: config
        });
        parser.collectExprs();
        return parser;
    }
});
},{"../../src/Config":1,"../../src/ExprParser":2}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9Db25maWcuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvRXhwclBhcnNlci5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9QYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvaW5oZXJpdC5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3Rlc3Qvc3JjL2Zha2VfZGUwNzAwZjcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAZmlsZSDphY3nva5cbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG5mdW5jdGlvbiBDb25maWcoKSB7XG4gICAgdGhpcy5leHByUHJlZml4ID0gJyR7JztcbiAgICB0aGlzLmV4cHJTdWZmaXggPSAnfSc7XG5cbiAgICB0aGlzLmlmTmFtZSA9ICdpZic7XG4gICAgdGhpcy5lbGlmTmFtZSA9ICdlbGlmJztcbiAgICB0aGlzLmVsc2VOYW1lID0gJ2Vsc2UnO1xuICAgIHRoaXMuaWZFbmROYW1lID0gJy9pZic7XG5cbiAgICB0aGlzLmlmUHJlZml4UmVnRXhwID0gL15cXHMqaWY6XFxzKi87XG4gICAgdGhpcy5lbGlmUHJlZml4UmVnRXhwID0gL15cXHMqZWxpZjpcXHMqLztcbiAgICB0aGlzLmVsc2VQcmVmaXhSZWdFeHAgPSAvXlxccyplbHNlXFxzKi87XG4gICAgdGhpcy5pZkVuZFByZWZpeFJlZ0V4cCA9IC9eXFxzKlxcL2lmXFxzKi87XG5cbiAgICB0aGlzLmZvck5hbWUgPSAnZm9yJztcbiAgICB0aGlzLmZvckVuZE5hbWUgPSAnL2Zvcic7XG5cbiAgICB0aGlzLmZvclByZWZpeFJlZ0V4cCA9IC9eXFxzKmZvcjpcXHMqLztcbiAgICB0aGlzLmZvckVuZFByZWZpeFJlZ0V4cCA9IC9eXFxzKlxcL2ZvclxccyovO1xufVxuXG5Db25maWcucHJvdG90eXBlLnNldEV4cHJQcmVmaXggPSBmdW5jdGlvbiAocHJlZml4KSB7XG4gICAgdGhpcy5leHByUHJlZml4ID0gcHJlZml4O1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRFeHByU3VmZml4ID0gZnVuY3Rpb24gKHN1ZmZpeCkge1xuICAgIHRoaXMuZXhwclN1ZmZpeCA9IHN1ZmZpeDtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuZ2V0RXhwclJlZ0V4cCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuZXhwclJlZ0V4cCkge1xuICAgICAgICB0aGlzLmV4cHJSZWdFeHAgPSBuZXcgUmVnRXhwKHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJQcmVmaXgpICsgJyguKyknICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclN1ZmZpeCksICdnJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmV4cHJSZWdFeHA7XG59O1xuXG5Db25maWcucHJvdG90eXBlLmdldEFsbElmUmVnRXhwID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5hbGxJZlJlZ0V4cCkge1xuICAgICAgICB0aGlzLmFsbElmUmVnRXhwID0gbmV3IFJlZ0V4cCgnXFxcXHMqKCdcbiAgICAgICAgICAgICsgdGhpcy5pZk5hbWUgKyAnfCdcbiAgICAgICAgICAgICsgdGhpcy5lbGlmTmFtZSArICd8J1xuICAgICAgICAgICAgKyB0aGlzLmVsc2VOYW1lICsgJ3wnXG4gICAgICAgICAgICArIHRoaXMuaWZFbmROYW1lICsgJyk6XFxcXHMqJywgJ2cnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYWxsSWZSZWdFeHA7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldElmTmFtZSA9IGZ1bmN0aW9uIChpZk5hbWUpIHtcbiAgICB0aGlzLmlmTmFtZSA9IGlmTmFtZTtcbiAgICB0aGlzLmlmUHJlZml4UmVnRXhwID0gbmV3IFJlZ0V4cCgnXlxcXFxzKicgKyBpZk5hbWUgKyAnOlxcXFxzKicpO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRFbGlmTmFtZSA9IGZ1bmN0aW9uIChlbGlmTmFtZSkge1xuICAgIHRoaXMuZWxpZk5hbWUgPSBlbGlmTmFtZTtcbiAgICB0aGlzLmVsaWZQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGVsaWZOYW1lICsgJzpcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0RWxzZU5hbWUgPSBmdW5jdGlvbiAoZWxzZU5hbWUpIHtcbiAgICB0aGlzLmVsc2VOYW1lID0gZWxzZU5hbWU7XG4gICAgdGhpcy5lbHNlUHJlZml4UmVnRXhwID0gbmV3IFJlZ0V4cCgnXlxcXFxzKicgKyBlbHNlTmFtZSArICdcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0SWZFbmROYW1lID0gZnVuY3Rpb24gKGlmRW5kTmFtZSkge1xuICAgIHRoaXMuaWZFbmROYW1lID0gaWZFbmROYW1lO1xuICAgIHRoaXMuaWZFbmRQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGlmRW5kTmFtZSArICdcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0Rm9yTmFtZSA9IGZ1bmN0aW9uIChmb3JOYW1lKSB7XG4gICAgdGhpcy5mb3JOYW1lID0gZm9yTmFtZTtcbiAgICB0aGlzLmZvclByZWZpeFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15cXFxccyonICsgZm9yTmFtZSArICc6XFxcXHMqJyk7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldEZvckVuZE5hbWUgPSBmdW5jdGlvbiAoZm9yRW5kTmFtZSkge1xuICAgIHRoaXMuZm9yRW5kTmFtZSA9IGZvckVuZE5hbWU7XG4gICAgdGhpcy5mb3JFbmRQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGZvckVuZE5hbWUgKyAnXFxcXHMqJyk7XG59O1xuXG5Db25maWcucHJvdG90eXBlLmdldEZvckV4cHJzUmVnRXhwID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5mb3JFeHByc1JlZ0V4cCkge1xuICAgICAgICB0aGlzLmZvckV4cHJzUmVnRXhwID0gbmV3IFJlZ0V4cCgnXFxcXHMqJ1xuICAgICAgICAgICAgKyB0aGlzLmZvck5hbWVcbiAgICAgICAgICAgICsgJzpcXFxccyonXG4gICAgICAgICAgICArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJQcmVmaXgpXG4gICAgICAgICAgICArICcoW14nICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclN1ZmZpeClcbiAgICAgICAgICAgICsgJ10rKScgKyByZWdFeHBFbmNvZGUodGhpcy5leHByU3VmZml4KSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZvckV4cHJzUmVnRXhwO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5nZXRGb3JJdGVtVmFsdWVOYW1lUmVnRXhwID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5mb3JJdGVtVmFsdWVOYW1lUmVnRXhwKSB7XG4gICAgICAgIHRoaXMuZm9ySXRlbVZhbHVlTmFtZVJlZ0V4cCA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgICAnYXNcXFxccyonICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclByZWZpeClcbiAgICAgICAgICAgICsgJyhbXicgKyByZWdFeHBFbmNvZGUodGhpcy5leHByU3VmZml4KSArICddKyknXG4gICAgICAgICAgICArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJTdWZmaXgpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZvckl0ZW1WYWx1ZU5hbWVSZWdFeHA7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbmZpZztcblxuZnVuY3Rpb24gcmVnRXhwRW5jb2RlKHN0cikge1xuICAgIHJldHVybiAnXFxcXCcgKyBzdHIuc3BsaXQoJycpLmpvaW4oJ1xcXFwnKTtcbn1cbiIsIi8qKlxuICogQGZpbGUg6KGo6L6+5byP6Kej5p6Q5Zmo77yM5LiA5Liq5paH5pys6IqC54K55oiW6ICF5YWD57Sg6IqC54K55a+55bqU5LiA5Liq6KGo6L6+5byP6Kej5p6Q5Zmo5a6e5L6LXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxudmFyIFBhcnNlciA9IHJlcXVpcmUoJy4vUGFyc2VyJyk7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJy4vaW5oZXJpdCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBFeHByUGFyc2VyKG9wdGlvbnMpIHtcbiAgICBQYXJzZXIuY2FsbCh0aGlzLCBvcHRpb25zKTtcbn1cblxuRXhwclBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdGhpcy5ub2RlID0gb3B0aW9ucy5ub2RlO1xuICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG5cbiAgICB0aGlzLmV4cHJzID0gW107XG4gICAgdGhpcy5leHByRm5zID0ge307XG4gICAgdGhpcy51cGRhdGVGbnMgPSB7fTtcbiAgICB0aGlzLmV4cHJPbGRWYWx1ZXMgPSB7fTtcbn07XG5cbkV4cHJQYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyTm9kZSA9IHRoaXMubm9kZTtcblxuICAgIC8vIOaWh+acrOiKgueCuVxuICAgIGlmIChjdXJOb2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIGFkZEV4cHIodGhpcywgY3VyTm9kZS5ub2RlVmFsdWUsIChmdW5jdGlvbiAoY3VyTm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChleHByVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBjdXJOb2RlLm5vZGVWYWx1ZSA9IGV4cHJWYWx1ZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pKGN1ck5vZGUpKTtcbiAgICB9XG4gICAgLy8g5YWD57Sg6IqC54K5XG4gICAgZWxzZSBpZiAoY3VyTm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICB2YXIgYXR0cmlidXRlcyA9IGN1ck5vZGUuYXR0cmlidXRlcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlsID0gYXR0cmlidXRlcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYXR0ciA9IGF0dHJpYnV0ZXNbaV07XG4gICAgICAgICAgICBhZGRFeHByKHRoaXMsIGF0dHIudmFsdWUsIGNyZWF0ZUF0dHJVcGRhdGVGbihhdHRyKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVBdHRyVXBkYXRlRm4oYXR0cikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGV4cHJWYWx1ZSkge1xuICAgICAgICAgICAgYXR0ci52YWx1ZSA9IGV4cHJWYWx1ZTtcbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG5FeHByUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgZXhwcnMgPSB0aGlzLmV4cHJzO1xuICAgIHZhciBleHByT2xkVmFsdWVzID0gdGhpcy5leHByT2xkVmFsdWVzO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGV4cHJzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgdmFyIGV4cHIgPSBleHByc1tpXTtcbiAgICAgICAgdmFyIGV4cHJWYWx1ZSA9IHRoaXMuZXhwckZuc1tleHByXShkYXRhKTtcblxuICAgICAgICBpZiAodGhpcy5kaXJ0eUNoZWNrKGV4cHIsIGV4cHJWYWx1ZSwgZXhwck9sZFZhbHVlc1tleHByXSkpIHtcbiAgICAgICAgICAgIHZhciB1cGRhdGVGbnMgPSB0aGlzLnVwZGF0ZUZuc1tleHByXTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwLCBqbCA9IHVwZGF0ZUZucy5sZW5ndGg7IGogPCBqbDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlRm5zW2pdKGV4cHJWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHByT2xkVmFsdWVzW2V4cHJdID0gZXhwclZhbHVlO1xuICAgIH1cbn07XG5cbkV4cHJQYXJzZXIucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy5nb0RhcmsodGhpcy5ub2RlKTtcbn07XG5cbkV4cHJQYXJzZXIucHJvdG90eXBlLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy5yZXN0b3JlRnJvbURhcmsodGhpcy5ub2RlKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0KEV4cHJQYXJzZXIsIFBhcnNlcik7XG5cbmZ1bmN0aW9uIGFkZEV4cHIocGFyc2VyLCBleHByLCB1cGRhdGVGbikge1xuICAgIHBhcnNlci5leHBycy5wdXNoKGV4cHIpO1xuICAgIGlmICghcGFyc2VyLmV4cHJGbnNbZXhwcl0pIHtcbiAgICAgICAgcGFyc2VyLmV4cHJGbnNbZXhwcl0gPSBjcmVhdGVFeHByRm4ocGFyc2VyLmNvbmZpZy5nZXRFeHByUmVnRXhwKCksIGV4cHIpO1xuICAgIH1cbiAgICBwYXJzZXIudXBkYXRlRm5zW2V4cHJdID0gcGFyc2VyLnVwZGF0ZUZuc1tleHByXSB8fCBbXTtcbiAgICBwYXJzZXIudXBkYXRlRm5zW2V4cHJdLnB1c2godXBkYXRlRm4pO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFeHByRm4oZXhwclJlZ0V4cCwgZXhwcikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICByZXR1cm4gZXhwci5yZXBsYWNlKGV4cHJSZWdFeHAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB1dGlscy5jYWxjdWxhdGVFeHByZXNzaW9uKGFyZ3VtZW50c1sxXSwgZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG4iLCIvKipcbiAqIEBmaWxlIOino+aekOWZqOeahOaKveixoeWfuuexu1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbi8qKlxuICog5p6E6YCg5Ye95pWwXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDphY3nva7lj4LmlbDvvIzkuIDoiKzlj6/og73kvJrmnInlpoLkuIvlhoXlrrnvvJpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydE5vZGU6IC4uLixcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmROb2RlOiAuLi4sXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogLi4uLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZzogLi4uXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICDlhbfkvZPmmK/llaXlj6/ku6Xlj4LliqDlhbfkvZPnmoTlrZDnsbtcbiAqL1xuZnVuY3Rpb24gUGFyc2VyKG9wdGlvbnMpIHtcbiAgICB0aGlzLmluaXRpYWxpemUob3B0aW9ucyk7XG59XG5cbi8qKlxuICog5Yid5aeL5YyWXG4gKlxuICogQHByb3RlY3RlZFxuICogQGFic3RyYWN0XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDmnaXoh6rkuo7mnoTpgKDlh73mlbBcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHt9O1xuXG4vKipcbiAqIOmUgOavgeino+aekOWZqFxuICpcbiAqIEBwdWJsaWNcbiAqIEBhYnN0cmFjdFxuICovXG5QYXJzZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDorr7nva7mlbDmja5cbiAqXG4gKiBAcHVibGljXG4gKiBAYWJzdHJhY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIOimgeiuvue9rueahOaVsOaNrlxuICovXG5QYXJzZXIucHJvdG90eXBlLnNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge307XG5cbi8qKlxuICog6ZqQ6JeP55u45YWz5YWD57SgXG4gKlxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vKipcbiAqIOaYvuekuuebuOWFs+WFg+e0oFxuICpcbiAqIEBwdWJsaWNcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDmkJzpm4booajovr7lvI/vvIznlJ/miJDooajovr7lvI/lh73mlbDlkowgRE9NIOabtOaWsOWHveaVsFxuICpcbiAqIEBhYnN0cmFjdFxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHt9O1xuXG5QYXJzZXIucHJvdG90eXBlLmRpcnR5Q2hlY2sgPSBmdW5jdGlvbiAoZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWUpIHtcbiAgICB2YXIgZGlydHlDaGVja2VyRm4gPSB0aGlzLmRpcnR5Q2hlY2tlciA/IHRoaXMuZGlydHlDaGVja2VyLmdldENoZWNrZXIoZXhwcikgOiBudWxsO1xuICAgIHJldHVybiAoZGlydHlDaGVja2VyRm4gJiYgZGlydHlDaGVja2VyRm4oZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWUpKVxuICAgICAgICAgICAgfHwgKCFkaXJ0eUNoZWNrZXJGbiAmJiBleHByVmFsdWUgIT09IGV4cHJPbGRWYWx1ZSk7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLnNldERpcnR5Q2hlY2tlciA9IGZ1bmN0aW9uIChkaXJ0eUNoZWNrZXIpIHtcbiAgICB0aGlzLmRpcnR5Q2hlY2tlciA9IGRpcnR5Q2hlY2tlcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGFyc2VyO1xuIiwiZnVuY3Rpb24gaW5oZXJpdChDaGlsZENsYXNzLCBQYXJlbnRDbGFzcykge1xuICAgIHZhciBjaGlsZFByb3RvID0gQ2hpbGRDbGFzcy5wcm90b3R5cGU7XG4gICAgQ2hpbGRDbGFzcy5wcm90b3R5cGUgPSBuZXcgUGFyZW50Q2xhc3MoKTtcbiAgICBmb3IgKHZhciBrZXkgaW4gY2hpbGRQcm90bykge1xuICAgICAgICBpZiAoY2hpbGRQcm90by5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBDaGlsZENsYXNzLnByb3RvdHlwZVtrZXldID0gY2hpbGRQcm90b1trZXldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBDaGlsZENsYXNzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluaGVyaXQ7IiwiZXhwb3J0cy5zbGljZSA9IGZ1bmN0aW9uIChhcnIsIHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyLCBzdGFydCwgZW5kKTtcbn07XG5cbi8qKlxuICog6K6h566X6KGo6L6+5byP55qE5YC8XG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV4cHJlc3Npb24g6KGo6L6+5byP5a2X56ym5Liy77yM57G75Ly85LqOIGAke25hbWV9YCDkuK3nmoQgbmFtZVxuICogQHBhcmFtICB7T2JqZWN0fSBjdXJEYXRhICAgIOW9k+WJjeihqOi+vuW8j+WvueW6lOeahOaVsOaNrlxuICogQHJldHVybiB7c3RyaW5nfSAgICAgICAgICAgIOiuoeeul+e7k+aenFxuICovXG5leHBvcnRzLmNhbGN1bGF0ZUV4cHJlc3Npb24gPSBmdW5jdGlvbiAoZXhwcmVzc2lvbiwgY3VyRGF0YSkge1xuICAgIHZhciBwYXJhbXMgPSBnZXRWYXJpYWJsZU5hbWVzRnJvbUV4cHIoZXhwcmVzc2lvbik7XG5cbiAgICB2YXIgZm5BcmdzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gcGFyYW1zLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcmFtID0gcGFyYW1zW2ldO1xuICAgICAgICB2YXIgdmFsdWUgPSBjdXJEYXRhW3BhcmFtXTtcbiAgICAgICAgZm5BcmdzLnB1c2godmFsdWUgPT09IHVuZGVmaW5lZCA/ICcnIDogdmFsdWUpO1xuICAgIH1cblxuICAgIHZhciByZXN1bHQ7XG4gICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gKG5ldyBGdW5jdGlvbihwYXJhbXMsICdyZXR1cm4gJyArIGV4cHJlc3Npb24pKS5hcHBseShudWxsLCBmbkFyZ3MpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICByZXN1bHQgPSAnJztcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuZXhwb3J0cy5nb0RhcmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBub2RlLl9fdGV4dF9fID0gbm9kZS5ub2RlVmFsdWU7XG4gICAgICAgIG5vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgfVxufTtcblxuZXhwb3J0cy5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgaWYgKG5vZGUuX190ZXh0X18gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbm9kZS5ub2RlVmFsdWUgPSBub2RlLl9fdGV4dF9fO1xuICAgICAgICAgICAgbm9kZS5fX3RleHRfXyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmV4cG9ydHMuY3JlYXRlRXhwckZuID0gZnVuY3Rpb24gKGV4cHJSZWdFeHAsIGV4cHIpIHtcbiAgICBleHByID0gZXhwci5yZXBsYWNlKGV4cHJSZWdFeHAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1sxXTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICByZXR1cm4gZXhwb3J0cy5jYWxjdWxhdGVFeHByZXNzaW9uKGV4cHIsIGRhdGEpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIOi2hee6p+eugOWNleeahCBleHRlbmQg77yM5Zug5Li65pys5bqT5a+5IGV4dGVuZCDmsqHpgqPpq5jnmoTopoHmsYLvvIxcbiAqIOetieWIsOacieimgeaxgueahOaXtuWAmeWGjeWujOWWhOOAglxuICpcbiAqIEBpbm5lclxuICogQHBhcmFtICB7T2JqZWN0fSB0YXJnZXQg55uu5qCH5a+56LGhXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICDmnIDnu4jlkIjlubblkI7nmoTlr7nosaFcbiAqL1xuZXhwb3J0cy5leHRlbmQgPSBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gICAgdmFyIHNyY3MgPSBleHBvcnRzLnNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gc3Jjcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzcmNzW2ldKSB7XG4gICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNyY3NbaV1ba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufTtcblxuZXhwb3J0cy50cmF2ZXJzZU5vZGVzID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgbm9kZUZuLCBjb250ZXh0KSB7XG4gICAgdmFyIG5vZGVzID0gW107XG4gICAgZm9yICh2YXIgY3VyTm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICAgICAgY3VyTm9kZSAmJiBjdXJOb2RlICE9PSBlbmROb2RlO1xuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZ1xuICAgICkge1xuICAgICAgICBub2Rlcy5wdXNoKGN1ck5vZGUpO1xuICAgIH1cblxuICAgIG5vZGVzLnB1c2goZW5kTm9kZSk7XG5cbiAgICBleHBvcnRzLmVhY2gobm9kZXMsIG5vZGVGbiwgY29udGV4dCk7XG59O1xuXG5leHBvcnRzLmVhY2ggPSBmdW5jdGlvbiAoYXJyLCBmbiwgY29udGV4dCkge1xuICAgIGlmIChleHBvcnRzLmlzQXJyYXkoYXJyKSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBhcnIubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgaWYgKGZuLmNhbGwoY29udGV4dCwgYXJyW2ldLCBpLCBhcnIpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGFyciA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBhcnIpIHtcbiAgICAgICAgICAgIGlmIChmbi5jYWxsKGNvbnRleHQsIGFycltrXSwgaywgYXJyKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0cy5pc0FycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PT0gJ29iamVjdCBBcnJheSc7XG59O1xuXG4vKipcbiAqIOS7juihqOi+vuW8j+S4reaKveemu+WHuuWPmOmHj+WQjVxuICpcbiAqIEBpbm5lclxuICogQHBhcmFtICB7c3RyaW5nfSBleHByIOihqOi+vuW8j+Wtl+espuS4su+8jOexu+S8vOS6jiBgJHtuYW1lfWAg5Lit55qEIG5hbWVcbiAqIEByZXR1cm4ge0FycmF5LjxzdHJpbmc+fSAgICAgIOWPmOmHj+WQjeaVsOe7hFxuICovXG52YXIgZXhwck5hbWVNYXAgPSB7fTtcbnZhciBleHByTmFtZVJlZ0V4cCA9IC9cXC4/XFwkPyhbYS16fEEtWl0rfChbYS16fEEtWl0rWzAtOV0rW2EtenxBLVpdKikpL2c7XG5mdW5jdGlvbiBnZXRWYXJpYWJsZU5hbWVzRnJvbUV4cHIoZXhwcikge1xuICAgIGlmIChleHByTmFtZU1hcFtleHByXSkge1xuICAgICAgICByZXR1cm4gZXhwck5hbWVNYXBbZXhwcl07XG4gICAgfVxuXG4gICAgdmFyIG1hdGNoZXMgPSBleHByLm1hdGNoKGV4cHJOYW1lUmVnRXhwKSB8fCBbXTtcbiAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBtYXRjaGVzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgaWYgKG1hdGNoZXNbaV0gJiYgbWF0Y2hlc1tpXVswXSAhPT0gJy4nKSB7XG4gICAgICAgICAgICBuYW1lcy5wdXNoKG1hdGNoZXNbaV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZXhwck5hbWVNYXBbZXhwcl0gPSBuYW1lcztcblxuICAgIHJldHVybiBuYW1lcztcbn1cbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuLi8uLi9zcmMvQ29uZmlnJyk7XG52YXIgRXhwclBhcnNlciA9IHJlcXVpcmUoJy4uLy4uL3NyYy9FeHByUGFyc2VyJyk7XG5cbmRlc2NyaWJlKCdFeHByUGFyc2VyJywgZnVuY3Rpb24gKCkge1xuICAgIHZhciBjb25maWc7XG4gICAgdmFyIHRlc3ROb2RlO1xuXG4gICAgYmVmb3JlQWxsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uZmlnID0gbmV3IENvbmZpZygpO1xuICAgICAgICB0ZXN0Tm9kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0ZXN0Jyk7XG4gICAgfSk7XG5cbiAgICBhZnRlckVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB0ZXN0Tm9kZS5pbm5lckhUTUwgPSAnJztcbiAgICB9KTtcblxuICAgIGl0KCcke25hbWV9JywgZnVuY3Rpb24gKCkge1xuICAgICAgICB0ZXN0Tm9kZS5pbm5lckhUTUwgPSAnJHtuYW1lfSc7XG5cbiAgICAgICAgdmFyIHBhcnNlciA9IGNyZWF0ZVBhcnNlcih0ZXN0Tm9kZS5maXJzdENoaWxkKTtcblxuICAgICAgICBwYXJzZXIuc2V0RGF0YSh7bmFtZTogJ3poYW5nc2FuJ30pO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuaW5uZXJUZXh0KS50b0VxdWFsKCd6aGFuZ3NhbicpO1xuXG4gICAgICAgIHBhcnNlci5zZXREYXRhKHt9KTtcbiAgICAgICAgZXhwZWN0KHRlc3ROb2RlLmlubmVyVGV4dCkudG9FcXVhbCgnJyk7XG5cbiAgICAgICAgcGFyc2VyLnNldERhdGEoe25hbWU6ICfmnY7lm5snfSk7XG4gICAgICAgIGV4cGVjdCh0ZXN0Tm9kZS5pbm5lclRleHQpLnRvRXF1YWwoJ+adjuWbmycpO1xuICAgIH0pO1xuXG4gICAgaXQoJyR7c3R1ZGVudC5uYW1lfScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGVzdE5vZGUuaW5uZXJUZXh0ID0gJyR7c3R1ZGVudC5uYW1lfSc7XG5cbiAgICAgICAgdmFyIHBhcnNlciA9IGNyZWF0ZVBhcnNlcih0ZXN0Tm9kZS5maXJzdENoaWxkKTtcblxuICAgICAgICBwYXJzZXIuc2V0RGF0YSh7c3R1ZGVudDoge25hbWU6ICflvKDkuIknfX0pO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuaW5uZXJUZXh0KS50b0VxdWFsKCflvKDkuIknKTtcblxuICAgICAgICBwYXJzZXIuc2V0RGF0YSh7c3R1ZGVudDogbnVsbH0pO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuaW5uZXJUZXh0KS50b0VxdWFsKCcnKTtcbiAgICB9KTtcblxuICAgIGl0KCckezEwIC0gbnVtfScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGVzdE5vZGUuaW5uZXJIVE1MID0gJyR7MTAgLSBudW19JztcblxuICAgICAgICB2YXIgcGFyc2VyID0gY3JlYXRlUGFyc2VyKHRlc3ROb2RlLmZpcnN0Q2hpbGQpO1xuXG4gICAgICAgIHBhcnNlci5zZXREYXRhKHtudW06IDh9KTtcbiAgICAgICAgZXhwZWN0KHRlc3ROb2RlLmlubmVyVGV4dCkudG9FcXVhbCgnMicpO1xuXG4gICAgICAgIHBhcnNlci5zZXREYXRhKHtudW06ICdhYWEnfSk7XG4gICAgICAgIGV4cGVjdCh0ZXN0Tm9kZS5pbm5lclRleHQpLnRvRXF1YWwoJ05hTicpO1xuICAgIH0pO1xuXG4gICAgaXQoJyR7My0xfScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGVzdE5vZGUuaW5uZXJIVE1MID0gJyR7My0xfSc7XG5cbiAgICAgICAgdmFyIHBhcnNlciA9IGNyZWF0ZVBhcnNlcih0ZXN0Tm9kZS5maXJzdENoaWxkKTtcblxuICAgICAgICBwYXJzZXIuc2V0RGF0YSh7fSk7XG4gICAgICAgIGV4cGVjdCh0ZXN0Tm9kZS5pbm5lclRleHQpLnRvRXF1YWwoJzInKTtcbiAgICB9KTtcblxuICAgIGl0KCcke2dldFNleChzZXgpfScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGVzdE5vZGUuaW5uZXJIVE1MID0gJyR7Z2V0U2V4KHNleCl9JztcblxuICAgICAgICB2YXIgcGFyc2VyID0gY3JlYXRlUGFyc2VyKHRlc3ROb2RlLmZpcnN0Q2hpbGQpO1xuXG4gICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgZ2V0U2V4OiBmdW5jdGlvbiAoc2V4KSB7XG4gICAgICAgICAgICAgICAgaWYgKHNleCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ+eUtyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzZXggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICflpbMnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gJ+acquefpeaAp+WIqyc7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V4OiAxXG4gICAgICAgIH07XG5cbiAgICAgICAgcGFyc2VyLnNldERhdGEoZGF0YSk7XG4gICAgICAgIGV4cGVjdCh0ZXN0Tm9kZS5pbm5lclRleHQpLnRvRXF1YWwoJ+eUtycpO1xuXG4gICAgICAgIGRhdGEuc2V4ID0gMDtcbiAgICAgICAgcGFyc2VyLnNldERhdGEoZGF0YSk7XG4gICAgICAgIGV4cGVjdCh0ZXN0Tm9kZS5pbm5lclRleHQpLnRvRXF1YWwoJ+WlsycpO1xuXG4gICAgICAgIGRhdGEuc2V4ID0gbnVsbDtcbiAgICAgICAgcGFyc2VyLnNldERhdGEoZGF0YSk7XG4gICAgICAgIGV4cGVjdCh0ZXN0Tm9kZS5pbm5lclRleHQpLnRvRXF1YWwoJ+acquefpeaAp+WIqycpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlUGFyc2VyKG5vZGUpIHtcbiAgICAgICAgdmFyIHBhcnNlciA9IG5ldyBFeHByUGFyc2VyKHtcbiAgICAgICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgICAgICBjb25maWc6IGNvbmZpZ1xuICAgICAgICB9KTtcbiAgICAgICAgcGFyc2VyLmNvbGxlY3RFeHBycygpO1xuICAgICAgICByZXR1cm4gcGFyc2VyO1xuICAgIH1cbn0pOyJdfQ==
