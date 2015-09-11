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
        this.exprRegExp = new RegExp(regExpEncode(this.exprPrefix) + '(.+?)' + regExpEncode(this.exprSuffix), 'g');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9Db25maWcuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvRXhwclBhcnNlci5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9QYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvaW5oZXJpdC5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3Rlc3Qvc3JjL2Zha2VfMmYxMWYwMGYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAZmlsZSDphY3nva5cbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG5mdW5jdGlvbiBDb25maWcoKSB7XG4gICAgdGhpcy5leHByUHJlZml4ID0gJyR7JztcbiAgICB0aGlzLmV4cHJTdWZmaXggPSAnfSc7XG5cbiAgICB0aGlzLmlmTmFtZSA9ICdpZic7XG4gICAgdGhpcy5lbGlmTmFtZSA9ICdlbGlmJztcbiAgICB0aGlzLmVsc2VOYW1lID0gJ2Vsc2UnO1xuICAgIHRoaXMuaWZFbmROYW1lID0gJy9pZic7XG5cbiAgICB0aGlzLmlmUHJlZml4UmVnRXhwID0gL15cXHMqaWY6XFxzKi87XG4gICAgdGhpcy5lbGlmUHJlZml4UmVnRXhwID0gL15cXHMqZWxpZjpcXHMqLztcbiAgICB0aGlzLmVsc2VQcmVmaXhSZWdFeHAgPSAvXlxccyplbHNlXFxzKi87XG4gICAgdGhpcy5pZkVuZFByZWZpeFJlZ0V4cCA9IC9eXFxzKlxcL2lmXFxzKi87XG5cbiAgICB0aGlzLmZvck5hbWUgPSAnZm9yJztcbiAgICB0aGlzLmZvckVuZE5hbWUgPSAnL2Zvcic7XG5cbiAgICB0aGlzLmZvclByZWZpeFJlZ0V4cCA9IC9eXFxzKmZvcjpcXHMqLztcbiAgICB0aGlzLmZvckVuZFByZWZpeFJlZ0V4cCA9IC9eXFxzKlxcL2ZvclxccyovO1xufVxuXG5Db25maWcucHJvdG90eXBlLnNldEV4cHJQcmVmaXggPSBmdW5jdGlvbiAocHJlZml4KSB7XG4gICAgdGhpcy5leHByUHJlZml4ID0gcHJlZml4O1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRFeHByU3VmZml4ID0gZnVuY3Rpb24gKHN1ZmZpeCkge1xuICAgIHRoaXMuZXhwclN1ZmZpeCA9IHN1ZmZpeDtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuZ2V0RXhwclJlZ0V4cCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuZXhwclJlZ0V4cCkge1xuICAgICAgICB0aGlzLmV4cHJSZWdFeHAgPSBuZXcgUmVnRXhwKHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJQcmVmaXgpICsgJyguKz8pJyArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJTdWZmaXgpLCAnZycpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5leHByUmVnRXhwO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5nZXRBbGxJZlJlZ0V4cCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuYWxsSWZSZWdFeHApIHtcbiAgICAgICAgdGhpcy5hbGxJZlJlZ0V4cCA9IG5ldyBSZWdFeHAoJ1xcXFxzKignXG4gICAgICAgICAgICArIHRoaXMuaWZOYW1lICsgJ3wnXG4gICAgICAgICAgICArIHRoaXMuZWxpZk5hbWUgKyAnfCdcbiAgICAgICAgICAgICsgdGhpcy5lbHNlTmFtZSArICd8J1xuICAgICAgICAgICAgKyB0aGlzLmlmRW5kTmFtZSArICcpOlxcXFxzKicsICdnJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmFsbElmUmVnRXhwO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRJZk5hbWUgPSBmdW5jdGlvbiAoaWZOYW1lKSB7XG4gICAgdGhpcy5pZk5hbWUgPSBpZk5hbWU7XG4gICAgdGhpcy5pZlByZWZpeFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15cXFxccyonICsgaWZOYW1lICsgJzpcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0RWxpZk5hbWUgPSBmdW5jdGlvbiAoZWxpZk5hbWUpIHtcbiAgICB0aGlzLmVsaWZOYW1lID0gZWxpZk5hbWU7XG4gICAgdGhpcy5lbGlmUHJlZml4UmVnRXhwID0gbmV3IFJlZ0V4cCgnXlxcXFxzKicgKyBlbGlmTmFtZSArICc6XFxcXHMqJyk7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldEVsc2VOYW1lID0gZnVuY3Rpb24gKGVsc2VOYW1lKSB7XG4gICAgdGhpcy5lbHNlTmFtZSA9IGVsc2VOYW1lO1xuICAgIHRoaXMuZWxzZVByZWZpeFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15cXFxccyonICsgZWxzZU5hbWUgKyAnXFxcXHMqJyk7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldElmRW5kTmFtZSA9IGZ1bmN0aW9uIChpZkVuZE5hbWUpIHtcbiAgICB0aGlzLmlmRW5kTmFtZSA9IGlmRW5kTmFtZTtcbiAgICB0aGlzLmlmRW5kUHJlZml4UmVnRXhwID0gbmV3IFJlZ0V4cCgnXlxcXFxzKicgKyBpZkVuZE5hbWUgKyAnXFxcXHMqJyk7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldEZvck5hbWUgPSBmdW5jdGlvbiAoZm9yTmFtZSkge1xuICAgIHRoaXMuZm9yTmFtZSA9IGZvck5hbWU7XG4gICAgdGhpcy5mb3JQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGZvck5hbWUgKyAnOlxcXFxzKicpO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRGb3JFbmROYW1lID0gZnVuY3Rpb24gKGZvckVuZE5hbWUpIHtcbiAgICB0aGlzLmZvckVuZE5hbWUgPSBmb3JFbmROYW1lO1xuICAgIHRoaXMuZm9yRW5kUHJlZml4UmVnRXhwID0gbmV3IFJlZ0V4cCgnXlxcXFxzKicgKyBmb3JFbmROYW1lICsgJ1xcXFxzKicpO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5nZXRGb3JFeHByc1JlZ0V4cCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuZm9yRXhwcnNSZWdFeHApIHtcbiAgICAgICAgdGhpcy5mb3JFeHByc1JlZ0V4cCA9IG5ldyBSZWdFeHAoJ1xcXFxzKidcbiAgICAgICAgICAgICsgdGhpcy5mb3JOYW1lXG4gICAgICAgICAgICArICc6XFxcXHMqJ1xuICAgICAgICAgICAgKyByZWdFeHBFbmNvZGUodGhpcy5leHByUHJlZml4KVxuICAgICAgICAgICAgKyAnKFteJyArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJTdWZmaXgpXG4gICAgICAgICAgICArICddKyknICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclN1ZmZpeCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mb3JFeHByc1JlZ0V4cDtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuZ2V0Rm9ySXRlbVZhbHVlTmFtZVJlZ0V4cCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuZm9ySXRlbVZhbHVlTmFtZVJlZ0V4cCkge1xuICAgICAgICB0aGlzLmZvckl0ZW1WYWx1ZU5hbWVSZWdFeHAgPSBuZXcgUmVnRXhwKFxuICAgICAgICAgICAgJ2FzXFxcXHMqJyArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJQcmVmaXgpXG4gICAgICAgICAgICArICcoW14nICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclN1ZmZpeCkgKyAnXSspJ1xuICAgICAgICAgICAgKyByZWdFeHBFbmNvZGUodGhpcy5leHByU3VmZml4KVxuICAgICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mb3JJdGVtVmFsdWVOYW1lUmVnRXhwO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb25maWc7XG5cbmZ1bmN0aW9uIHJlZ0V4cEVuY29kZShzdHIpIHtcbiAgICByZXR1cm4gJ1xcXFwnICsgc3RyLnNwbGl0KCcnKS5qb2luKCdcXFxcJyk7XG59XG4iLCIvKipcbiAqIEBmaWxlIOihqOi+vuW8j+ino+aekOWZqO+8jOS4gOS4quaWh+acrOiKgueCueaIluiAheWFg+e0oOiKgueCueWvueW6lOS4gOS4quihqOi+vuW8j+ino+aekOWZqOWunuS+i1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbnZhciBQYXJzZXIgPSByZXF1aXJlKCcuL1BhcnNlcicpO1xudmFyIGluaGVyaXQgPSByZXF1aXJlKCcuL2luaGVyaXQnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuZnVuY3Rpb24gRXhwclBhcnNlcihvcHRpb25zKSB7XG4gICAgUGFyc2VyLmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG5cbkV4cHJQYXJzZXIucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHRoaXMubm9kZSA9IG9wdGlvbnMubm9kZTtcbiAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xuXG4gICAgdGhpcy5leHBycyA9IFtdO1xuICAgIHRoaXMuZXhwckZucyA9IHt9O1xuICAgIHRoaXMudXBkYXRlRm5zID0ge307XG4gICAgdGhpcy5leHByT2xkVmFsdWVzID0ge307XG59O1xuXG5FeHByUGFyc2VyLnByb3RvdHlwZS5jb2xsZWN0RXhwcnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1ck5vZGUgPSB0aGlzLm5vZGU7XG5cbiAgICAvLyDmlofmnKzoioLngrlcbiAgICBpZiAoY3VyTm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBhZGRFeHByKHRoaXMsIGN1ck5vZGUubm9kZVZhbHVlLCAoZnVuY3Rpb24gKGN1ck5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXhwclZhbHVlKSB7XG4gICAgICAgICAgICAgICAgY3VyTm9kZS5ub2RlVmFsdWUgPSBleHByVmFsdWU7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KShjdXJOb2RlKSk7XG4gICAgfVxuICAgIC8vIOWFg+e0oOiKgueCuVxuICAgIGVsc2UgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBjdXJOb2RlLmF0dHJpYnV0ZXM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGF0dHJpYnV0ZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgdmFyIGF0dHIgPSBhdHRyaWJ1dGVzW2ldO1xuICAgICAgICAgICAgYWRkRXhwcih0aGlzLCBhdHRyLnZhbHVlLCBjcmVhdGVBdHRyVXBkYXRlRm4oYXR0cikpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlQXR0clVwZGF0ZUZuKGF0dHIpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChleHByVmFsdWUpIHtcbiAgICAgICAgICAgIGF0dHIudmFsdWUgPSBleHByVmFsdWU7XG4gICAgICAgIH07XG4gICAgfVxufTtcblxuRXhwclBhcnNlci5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGV4cHJzID0gdGhpcy5leHBycztcbiAgICB2YXIgZXhwck9sZFZhbHVlcyA9IHRoaXMuZXhwck9sZFZhbHVlcztcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBleHBycy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIHZhciBleHByID0gZXhwcnNbaV07XG4gICAgICAgIHZhciBleHByVmFsdWUgPSB0aGlzLmV4cHJGbnNbZXhwcl0oZGF0YSk7XG5cbiAgICAgICAgaWYgKHRoaXMuZGlydHlDaGVjayhleHByLCBleHByVmFsdWUsIGV4cHJPbGRWYWx1ZXNbZXhwcl0pKSB7XG4gICAgICAgICAgICB2YXIgdXBkYXRlRm5zID0gdGhpcy51cGRhdGVGbnNbZXhwcl07XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMCwgamwgPSB1cGRhdGVGbnMubGVuZ3RoOyBqIDwgamw7IGorKykge1xuICAgICAgICAgICAgICAgIHVwZGF0ZUZuc1tqXShleHByVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwck9sZFZhbHVlc1tleHByXSA9IGV4cHJWYWx1ZTtcbiAgICB9XG59O1xuXG5FeHByUGFyc2VyLnByb3RvdHlwZS5nb0RhcmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgdXRpbHMuZ29EYXJrKHRoaXMubm9kZSk7XG59O1xuXG5FeHByUGFyc2VyLnByb3RvdHlwZS5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgdXRpbHMucmVzdG9yZUZyb21EYXJrKHRoaXMubm9kZSk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gaW5oZXJpdChFeHByUGFyc2VyLCBQYXJzZXIpO1xuXG5mdW5jdGlvbiBhZGRFeHByKHBhcnNlciwgZXhwciwgdXBkYXRlRm4pIHtcbiAgICBwYXJzZXIuZXhwcnMucHVzaChleHByKTtcbiAgICBpZiAoIXBhcnNlci5leHByRm5zW2V4cHJdKSB7XG4gICAgICAgIHBhcnNlci5leHByRm5zW2V4cHJdID0gY3JlYXRlRXhwckZuKHBhcnNlci5jb25maWcuZ2V0RXhwclJlZ0V4cCgpLCBleHByKTtcbiAgICB9XG4gICAgcGFyc2VyLnVwZGF0ZUZuc1tleHByXSA9IHBhcnNlci51cGRhdGVGbnNbZXhwcl0gfHwgW107XG4gICAgcGFyc2VyLnVwZGF0ZUZuc1tleHByXS5wdXNoKHVwZGF0ZUZuKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRXhwckZuKGV4cHJSZWdFeHAsIGV4cHIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGV4cHIucmVwbGFjZShleHByUmVnRXhwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdXRpbHMuY2FsY3VsYXRlRXhwcmVzc2lvbihhcmd1bWVudHNbMV0sIGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9O1xufVxuIiwiLyoqXG4gKiBAZmlsZSDop6PmnpDlmajnmoTmir3osaHln7rnsbtcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG4vKipcbiAqIOaehOmAoOWHveaVsFxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMg6YWN572u5Y+C5pWw77yM5LiA6Iis5Y+v6IO95Lya5pyJ5aaC5LiL5YaF5a6577yaXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnROb2RlOiAuLi4sXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kTm9kZTogLi4uLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGU6IC4uLixcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25maWc6IC4uLlxuICogICAgICAgICAgICAgICAgICAgICAgICAgfVxuICogICAgICAgICAgICAgICAgICAgICAgICAg5YW35L2T5piv5ZWl5Y+v5Lul5Y+C5Yqg5YW35L2T55qE5a2Q57G7XG4gKi9cbmZ1bmN0aW9uIFBhcnNlcihvcHRpb25zKSB7XG4gICAgdGhpcy5pbml0aWFsaXplKG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIOWIneWni+WMllxuICpcbiAqIEBwcm90ZWN0ZWRcbiAqIEBhYnN0cmFjdFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMg5p2l6Ieq5LqO5p6E6YCg5Ye95pWwXG4gKi9cblBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7fTtcblxuLyoqXG4gKiDplIDmr4Hop6PmnpDlmahcbiAqXG4gKiBAcHVibGljXG4gKiBAYWJzdHJhY3RcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge307XG5cbi8qKlxuICog6K6+572u5pWw5o2uXG4gKlxuICogQHB1YmxpY1xuICogQGFic3RyYWN0XG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSDopoHorr7nva7nmoTmlbDmja5cbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHt9O1xuXG4vKipcbiAqIOmakOiXj+ebuOWFs+WFg+e0oFxuICpcbiAqIEBwdWJsaWNcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5nb0RhcmsgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDmmL7npLrnm7jlhbPlhYPntKBcbiAqXG4gKiBAcHVibGljXG4gKi9cblBhcnNlci5wcm90b3R5cGUucmVzdG9yZUZyb21EYXJrID0gZnVuY3Rpb24gKCkge307XG5cbi8qKlxuICog5pCc6ZuG6KGo6L6+5byP77yM55Sf5oiQ6KGo6L6+5byP5Ye95pWw5ZKMIERPTSDmm7TmlrDlh73mlbBcbiAqXG4gKiBAYWJzdHJhY3RcbiAqIEBwdWJsaWNcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5jb2xsZWN0RXhwcnMgPSBmdW5jdGlvbiAoKSB7fTtcblxuUGFyc2VyLnByb3RvdHlwZS5kaXJ0eUNoZWNrID0gZnVuY3Rpb24gKGV4cHIsIGV4cHJWYWx1ZSwgZXhwck9sZFZhbHVlKSB7XG4gICAgdmFyIGRpcnR5Q2hlY2tlckZuID0gdGhpcy5kaXJ0eUNoZWNrZXIgPyB0aGlzLmRpcnR5Q2hlY2tlci5nZXRDaGVja2VyKGV4cHIpIDogbnVsbDtcbiAgICByZXR1cm4gKGRpcnR5Q2hlY2tlckZuICYmIGRpcnR5Q2hlY2tlckZuKGV4cHIsIGV4cHJWYWx1ZSwgZXhwck9sZFZhbHVlKSlcbiAgICAgICAgICAgIHx8ICghZGlydHlDaGVja2VyRm4gJiYgZXhwclZhbHVlICE9PSBleHByT2xkVmFsdWUpO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5zZXREaXJ0eUNoZWNrZXIgPSBmdW5jdGlvbiAoZGlydHlDaGVja2VyKSB7XG4gICAgdGhpcy5kaXJ0eUNoZWNrZXIgPSBkaXJ0eUNoZWNrZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhcnNlcjtcbiIsImZ1bmN0aW9uIGluaGVyaXQoQ2hpbGRDbGFzcywgUGFyZW50Q2xhc3MpIHtcbiAgICB2YXIgY2hpbGRQcm90byA9IENoaWxkQ2xhc3MucHJvdG90eXBlO1xuICAgIENoaWxkQ2xhc3MucHJvdG90eXBlID0gbmV3IFBhcmVudENsYXNzKCk7XG4gICAgZm9yICh2YXIga2V5IGluIGNoaWxkUHJvdG8pIHtcbiAgICAgICAgaWYgKGNoaWxkUHJvdG8uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgQ2hpbGRDbGFzcy5wcm90b3R5cGVba2V5XSA9IGNoaWxkUHJvdG9ba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gQ2hpbGRDbGFzcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0OyIsImV4cG9ydHMuc2xpY2UgPSBmdW5jdGlvbiAoYXJyLCBzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyciwgc3RhcnQsIGVuZCk7XG59O1xuXG4vKipcbiAqIOiuoeeul+ihqOi+vuW8j+eahOWAvFxuICpcbiAqIEBpbm5lclxuICogQHBhcmFtICB7c3RyaW5nfSBleHByZXNzaW9uIOihqOi+vuW8j+Wtl+espuS4su+8jOexu+S8vOS6jiBgJHtuYW1lfWAg5Lit55qEIG5hbWVcbiAqIEBwYXJhbSAge09iamVjdH0gY3VyRGF0YSAgICDlvZPliY3ooajovr7lvI/lr7nlupTnmoTmlbDmja5cbiAqIEByZXR1cm4ge3N0cmluZ30gICAgICAgICAgICDorqHnrpfnu5PmnpxcbiAqL1xuZXhwb3J0cy5jYWxjdWxhdGVFeHByZXNzaW9uID0gZnVuY3Rpb24gKGV4cHJlc3Npb24sIGN1ckRhdGEpIHtcbiAgICB2YXIgcGFyYW1zID0gZ2V0VmFyaWFibGVOYW1lc0Zyb21FeHByKGV4cHJlc3Npb24pO1xuXG4gICAgdmFyIGZuQXJncyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IHBhcmFtcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIHZhciBwYXJhbSA9IHBhcmFtc1tpXTtcbiAgICAgICAgdmFyIHZhbHVlID0gY3VyRGF0YVtwYXJhbV07XG4gICAgICAgIGZuQXJncy5wdXNoKHZhbHVlID09PSB1bmRlZmluZWQgPyAnJyA6IHZhbHVlKTtcbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0O1xuICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IChuZXcgRnVuY3Rpb24ocGFyYW1zLCAncmV0dXJuICcgKyBleHByZXNzaW9uKSkuYXBwbHkobnVsbCwgZm5BcmdzKTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVzdWx0ID0gJyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbmV4cG9ydHMuZ29EYXJrID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICBub2RlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgbm9kZS5fX3RleHRfXyA9IG5vZGUubm9kZVZhbHVlO1xuICAgICAgICBub2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgIH1cbn07XG5cbmV4cG9ydHMucmVzdG9yZUZyb21EYXJrID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICBub2RlLnN0eWxlLmRpc3BsYXkgPSBudWxsO1xuICAgIH1cbiAgICBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIGlmIChub2RlLl9fdGV4dF9fICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIG5vZGUubm9kZVZhbHVlID0gbm9kZS5fX3RleHRfXztcbiAgICAgICAgICAgIG5vZGUuX190ZXh0X18gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5leHBvcnRzLmNyZWF0ZUV4cHJGbiA9IGZ1bmN0aW9uIChleHByUmVnRXhwLCBleHByKSB7XG4gICAgZXhwciA9IGV4cHIucmVwbGFjZShleHByUmVnRXhwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBhcmd1bWVudHNbMV07XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGV4cG9ydHMuY2FsY3VsYXRlRXhwcmVzc2lvbihleHByLCBkYXRhKTtcbiAgICB9O1xufTtcblxuLyoqXG4gKiDotoXnuqfnroDljZXnmoQgZXh0ZW5kIO+8jOWboOS4uuacrOW6k+WvuSBleHRlbmQg5rKh6YKj6auY55qE6KaB5rGC77yMXG4gKiDnrYnliLDmnInopoHmsYLnmoTml7blgJnlho3lrozlloTjgIJcbiAqXG4gKiBAaW5uZXJcbiAqIEBwYXJhbSAge09iamVjdH0gdGFyZ2V0IOebruagh+WvueixoVxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAg5pyA57uI5ZCI5bm25ZCO55qE5a+56LGhXG4gKi9cbmV4cG9ydHMuZXh0ZW5kID0gZnVuY3Rpb24gKHRhcmdldCkge1xuICAgIHZhciBzcmNzID0gZXhwb3J0cy5zbGljZShhcmd1bWVudHMsIDEpO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IHNyY3MubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3Jjc1tpXSkge1xuICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzcmNzW2ldW2tleV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn07XG5cbmV4cG9ydHMudHJhdmVyc2VOb2RlcyA9IGZ1bmN0aW9uIChzdGFydE5vZGUsIGVuZE5vZGUsIG5vZGVGbiwgY29udGV4dCkge1xuICAgIHZhciBub2RlcyA9IFtdO1xuICAgIGZvciAodmFyIGN1ck5vZGUgPSBzdGFydE5vZGU7XG4gICAgICAgIGN1ck5vZGUgJiYgY3VyTm9kZSAhPT0gZW5kTm9kZTtcbiAgICAgICAgY3VyTm9kZSA9IGN1ck5vZGUubmV4dFNpYmxpbmdcbiAgICApIHtcbiAgICAgICAgbm9kZXMucHVzaChjdXJOb2RlKTtcbiAgICB9XG5cbiAgICBub2Rlcy5wdXNoKGVuZE5vZGUpO1xuXG4gICAgZXhwb3J0cy5lYWNoKG5vZGVzLCBub2RlRm4sIGNvbnRleHQpO1xufTtcblxuZXhwb3J0cy5lYWNoID0gZnVuY3Rpb24gKGFyciwgZm4sIGNvbnRleHQpIHtcbiAgICBpZiAoZXhwb3J0cy5pc0FycmF5KGFycikpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlsID0gYXJyLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChmbi5jYWxsKGNvbnRleHQsIGFycltpXSwgaSwgYXJyKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBhcnIgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGZvciAodmFyIGsgaW4gYXJyKSB7XG4gICAgICAgICAgICBpZiAoZm4uY2FsbChjb250ZXh0LCBhcnJba10sIGssIGFycikpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmV4cG9ydHMuaXNBcnJheSA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycikgPT09ICdvYmplY3QgQXJyYXknO1xufTtcblxuLyoqXG4gKiDku47ooajovr7lvI/kuK3mir3nprvlh7rlj5jph4/lkI1cbiAqXG4gKiBAaW5uZXJcbiAqIEBwYXJhbSAge3N0cmluZ30gZXhwciDooajovr7lvI/lrZfnrKbkuLLvvIznsbvkvLzkuo4gYCR7bmFtZX1gIOS4reeahCBuYW1lXG4gKiBAcmV0dXJuIHtBcnJheS48c3RyaW5nPn0gICAgICDlj5jph4/lkI3mlbDnu4RcbiAqL1xudmFyIGV4cHJOYW1lTWFwID0ge307XG52YXIgZXhwck5hbWVSZWdFeHAgPSAvXFwuP1xcJD8oW2EtenxBLVpdK3woW2EtenxBLVpdK1swLTldK1thLXp8QS1aXSopKS9nO1xuZnVuY3Rpb24gZ2V0VmFyaWFibGVOYW1lc0Zyb21FeHByKGV4cHIpIHtcbiAgICBpZiAoZXhwck5hbWVNYXBbZXhwcl0pIHtcbiAgICAgICAgcmV0dXJuIGV4cHJOYW1lTWFwW2V4cHJdO1xuICAgIH1cblxuICAgIHZhciBtYXRjaGVzID0gZXhwci5tYXRjaChleHByTmFtZVJlZ0V4cCkgfHwgW107XG4gICAgdmFyIG5hbWVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gbWF0Y2hlcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIGlmIChtYXRjaGVzW2ldICYmIG1hdGNoZXNbaV1bMF0gIT09ICcuJykge1xuICAgICAgICAgICAgbmFtZXMucHVzaChtYXRjaGVzW2ldKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGV4cHJOYW1lTWFwW2V4cHJdID0gbmFtZXM7XG5cbiAgICByZXR1cm4gbmFtZXM7XG59XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi4vLi4vc3JjL0NvbmZpZycpO1xudmFyIEV4cHJQYXJzZXIgPSByZXF1aXJlKCcuLi8uLi9zcmMvRXhwclBhcnNlcicpO1xuXG5kZXNjcmliZSgnRXhwclBhcnNlcicsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY29uZmlnO1xuICAgIHZhciB0ZXN0Tm9kZTtcblxuICAgIGJlZm9yZUFsbChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbmZpZyA9IG5ldyBDb25maWcoKTtcbiAgICAgICAgdGVzdE5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGVzdCcpO1xuICAgIH0pO1xuXG4gICAgYWZ0ZXJFYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGVzdE5vZGUuaW5uZXJIVE1MID0gJyc7XG4gICAgfSk7XG5cbiAgICBpdCgnJHtuYW1lfScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGVzdE5vZGUuaW5uZXJIVE1MID0gJyR7bmFtZX0nO1xuXG4gICAgICAgIHZhciBwYXJzZXIgPSBjcmVhdGVQYXJzZXIodGVzdE5vZGUuZmlyc3RDaGlsZCk7XG5cbiAgICAgICAgcGFyc2VyLnNldERhdGEoe25hbWU6ICd6aGFuZ3Nhbid9KTtcbiAgICAgICAgZXhwZWN0KHRlc3ROb2RlLmlubmVyVGV4dCkudG9FcXVhbCgnemhhbmdzYW4nKTtcblxuICAgICAgICBwYXJzZXIuc2V0RGF0YSh7fSk7XG4gICAgICAgIGV4cGVjdCh0ZXN0Tm9kZS5pbm5lclRleHQpLnRvRXF1YWwoJycpO1xuXG4gICAgICAgIHBhcnNlci5zZXREYXRhKHtuYW1lOiAn5p2O5ZubJ30pO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuaW5uZXJUZXh0KS50b0VxdWFsKCfmnY7lm5snKTtcbiAgICB9KTtcblxuICAgIGl0KCcke3N0dWRlbnQubmFtZX0nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRlc3ROb2RlLmlubmVyVGV4dCA9ICcke3N0dWRlbnQubmFtZX0nO1xuXG4gICAgICAgIHZhciBwYXJzZXIgPSBjcmVhdGVQYXJzZXIodGVzdE5vZGUuZmlyc3RDaGlsZCk7XG5cbiAgICAgICAgcGFyc2VyLnNldERhdGEoe3N0dWRlbnQ6IHtuYW1lOiAn5byg5LiJJ319KTtcbiAgICAgICAgZXhwZWN0KHRlc3ROb2RlLmlubmVyVGV4dCkudG9FcXVhbCgn5byg5LiJJyk7XG5cbiAgICAgICAgcGFyc2VyLnNldERhdGEoe3N0dWRlbnQ6IG51bGx9KTtcbiAgICAgICAgZXhwZWN0KHRlc3ROb2RlLmlubmVyVGV4dCkudG9FcXVhbCgnJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnJHsxMCAtIG51bX0nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRlc3ROb2RlLmlubmVySFRNTCA9ICckezEwIC0gbnVtfSc7XG5cbiAgICAgICAgdmFyIHBhcnNlciA9IGNyZWF0ZVBhcnNlcih0ZXN0Tm9kZS5maXJzdENoaWxkKTtcblxuICAgICAgICBwYXJzZXIuc2V0RGF0YSh7bnVtOiA4fSk7XG4gICAgICAgIGV4cGVjdCh0ZXN0Tm9kZS5pbm5lclRleHQpLnRvRXF1YWwoJzInKTtcblxuICAgICAgICBwYXJzZXIuc2V0RGF0YSh7bnVtOiAnYWFhJ30pO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuaW5uZXJUZXh0KS50b0VxdWFsKCdOYU4nKTtcbiAgICB9KTtcblxuICAgIGl0KCckezMtMX0nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRlc3ROb2RlLmlubmVySFRNTCA9ICckezMtMX0nO1xuXG4gICAgICAgIHZhciBwYXJzZXIgPSBjcmVhdGVQYXJzZXIodGVzdE5vZGUuZmlyc3RDaGlsZCk7XG5cbiAgICAgICAgcGFyc2VyLnNldERhdGEoe30pO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuaW5uZXJUZXh0KS50b0VxdWFsKCcyJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnJHtnZXRTZXgoc2V4KX0nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRlc3ROb2RlLmlubmVySFRNTCA9ICcke2dldFNleChzZXgpfSc7XG5cbiAgICAgICAgdmFyIHBhcnNlciA9IGNyZWF0ZVBhcnNlcih0ZXN0Tm9kZS5maXJzdENoaWxkKTtcblxuICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgIGdldFNleDogZnVuY3Rpb24gKHNleCkge1xuICAgICAgICAgICAgICAgIGlmIChzZXggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICfnlLcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc2V4ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAn5aWzJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICfmnKrnn6XmgKfliKsnO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNleDogMVxuICAgICAgICB9O1xuXG4gICAgICAgIHBhcnNlci5zZXREYXRhKGRhdGEpO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuaW5uZXJUZXh0KS50b0VxdWFsKCfnlLcnKTtcblxuICAgICAgICBkYXRhLnNleCA9IDA7XG4gICAgICAgIHBhcnNlci5zZXREYXRhKGRhdGEpO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuaW5uZXJUZXh0KS50b0VxdWFsKCflpbMnKTtcblxuICAgICAgICBkYXRhLnNleCA9IG51bGw7XG4gICAgICAgIHBhcnNlci5zZXREYXRhKGRhdGEpO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuaW5uZXJUZXh0KS50b0VxdWFsKCfmnKrnn6XmgKfliKsnKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVBhcnNlcihub2RlKSB7XG4gICAgICAgIHZhciBwYXJzZXIgPSBuZXcgRXhwclBhcnNlcih7XG4gICAgICAgICAgICBub2RlOiBub2RlLFxuICAgICAgICAgICAgY29uZmlnOiBjb25maWdcbiAgICAgICAgfSk7XG4gICAgICAgIHBhcnNlci5jb2xsZWN0RXhwcnMoKTtcbiAgICAgICAgcmV0dXJuIHBhcnNlcjtcbiAgICB9XG59KTsiXX0=
