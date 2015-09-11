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

},{"./Parser":5,"./inherit":7,"./utils":8}],3:[function(require,module,exports){
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

},{"./Parser":5,"./inherit":7,"./utils":8}],4:[function(require,module,exports){
/**
 * @file if 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');
var inherit = require('./inherit');
var utils = require('./utils');

function IfDirectiveParser(options) {
    Parser.call(this, options);
}

IfDirectiveParser.prototype.initialize = function (options) {
    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;

    this.exprs = [];
    this.exprFns = {};
};

IfDirectiveParser.prototype.collectExprs = function () {
    var curNode = this.startNode;
    var branches = [];
    var branchIndex = -1;
    do {
        var nodeType = getIfNodeType(curNode, this.config);

        if (nodeType) {
            setEndNode(curNode, branches, branchIndex);

            branchIndex++;
            branches[branchIndex] = branches[branchIndex] || {};

            // 是 if 节点或者 elif 节点，搜集表达式
            if (nodeType < 3) {
                var expr = curNode.nodeValue.replace(this.config.getAllIfRegExp(), '');
                this.exprs.push(expr);

                if (!this.exprFns[expr]) {
                    this.exprFns[expr] = utils.createExprFn(this.config.getExprRegExp(), expr);
                }
            }
        }
        else {
            if (!branches[branchIndex].startNode) {
                branches[branchIndex].startNode = curNode;
            }
        }

        curNode = curNode.nextSibling;
        if (!curNode || curNode === this.endNode) {
            setEndNode(curNode, branches, branchIndex);
            break;
        }
    } while (true);

    return branches;

    function setEndNode(curNode, branches, branchIndex) {
        if (branchIndex + 1 && branches[branchIndex].startNode) {
            branches[branchIndex].endNode = curNode.previousSibling;
        }
    }
};

IfDirectiveParser.prototype.setData = function (data) {
    var exprs = this.exprs;
    for (var i = 0, il = exprs.length; i < il; i++) {
        var expr = exprs[i];
        var exprValue = this.exprFns[expr](data);
        if (exprValue) {
            return i;
        }
    }
};

IfDirectiveParser.isIfNode = function (node, config) {
    return getIfNodeType(node, config) === 1;
};

IfDirectiveParser.isElifNode = function (node, config) {
    return getIfNodeType(node, config) === 2;
};

IfDirectiveParser.isElseNode = function (node, config) {
    return getIfNodeType(node, config) === 3;
};

IfDirectiveParser.isIfEndNode = function (node, config) {
    return getIfNodeType(node, config) === 4;
};

IfDirectiveParser.findIfEnd = function (ifStartNode, config) {
    var curNode = ifStartNode;
    while ((curNode = curNode.nextSibling)) {
        if (IfDirectiveParser.isIfEndNode(curNode, config)) {
            return curNode;
        }
    }
};

module.exports = inherit(IfDirectiveParser, Parser);

function getIfNodeType(node, config) {
    if (node.nodeType !== 8) {
        return;
    }

    if (config.ifPrefixRegExp.test(node.nodeValue)) {
        return 1;
    }

    if (config.elifPrefixRegExp.test(node.nodeValue)) {
        return 2;
    }

    if (config.elsePrefixRegExp.test(node.nodeValue)) {
        return 3;
    }

    if (config.ifEndPrefixRegExp.test(node.nodeValue)) {
        return 4;
    }
}

},{"./Parser":5,"./inherit":7,"./utils":8}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
/**
 * @file 最终的树
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var IfDirectiveParser = require('./IfDirectiveParser');
var ExprParser = require('./ExprParser');
var ForDirectiveParser = require('./ForDirectiveParser');
var utils = require('./utils');

function Tree(options) {
    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;

    this.tree = [];
}

Tree.prototype.traverse = function () {
    walk(this, this.startNode, this.endNode, this.tree);
};

Tree.prototype.setData = function (data) {
    data = data || {};
    walkParsers(this, this.tree, data);
};

Tree.prototype.goDark = function () {
    var curNode = this.startNode;
    do {
        if (curNode.nodeType === 1 || curNode.nodeType === 3) {
            utils.goDark(curNode);
        }
    } while ((curNode = curNode.nextSibling) && curNode !== this.endNode);
};

Tree.prototype.restoreFromDark = function () {
    var curNode = this.startNode;
    do {
        if (curNode.nodeType === 1 || curNode.nodeType === 3) {
            utils.restoreFromDark(curNode);
        }
    } while ((curNode = curNode.nextSibling) && curNode !== this.endNode);
};

Tree.prototype.setDirtyChecker = function (dirtyChecker) {
    this.dirtyChecker = dirtyChecker;
};

module.exports = Tree;

function walkParsers(tree, parsers, data) {
    for (var i = 0, il = parsers.length; i < il; i++) {
        var parserObj = parsers[i];
        parserObj.parser.setDirtyChecker(tree.dirtyChecker);
        parserObj.data = utils.extend({}, parserObj.data || {}, data);

        if (parserObj.parser instanceof IfDirectiveParser) {
            var branchIndex = parserObj.parser.setData(parserObj.data);
            var branches = parserObj.children;
            for (var j = 0, jl = branches.length; j < jl; j++) {
                if (j === branchIndex) {
                    walkParsers(tree, branches[j], parserObj.data);
                    continue;
                }

                for (var z = 0, zl = branches[j].length; z < zl; z++) {
                    if (branches[j][z].parser instanceof ExprParser) {
                        branches[j][z].parser.goDark();
                    }
                }
            }
        }
        else {
            if (parserObj.parser instanceof ExprParser) {
                parserObj.parser.restoreFromDark();
            }
            parserObj.parser.setData(parserObj.data);
            if (parserObj.children) {
                walkParsers(tree, parserObj.children, parserObj.data);
            }
        }
    }
}

function walk(tree, startNode, endNode, container) {
    var curNode = startNode;
    do {
        if (!curNode) {
            break;
        }

        if (IfDirectiveParser.isIfNode(curNode, tree.config)) {
            var ifEndNode = IfDirectiveParser.findIfEnd(curNode, tree.config);
            if (!ifEndNode) {
                throw new Error('the if directive is not properly ended!');
            }

            var ifDirectiveParser = new IfDirectiveParser({
                startNode: curNode,
                endNode: ifEndNode,
                config: tree.config
            });

            var branches = ifDirectiveParser.collectExprs();
            container.push({parser: ifDirectiveParser, children: branches});
            for (var i = 0, il = branches.length; i < il; i++) {
                if (!branches[i].startNode || !branches[i].endNode) {
                    continue;
                }

                var ifCon = [];
                walk(tree, branches[i].startNode, branches[i].endNode, ifCon);
                branches[i] = ifCon;
            }

            curNode = ifEndNode.nextSibling;
            continue;
        }
        else if (ForDirectiveParser.isForNode(curNode, tree.config)) {
            var forEndNode = ForDirectiveParser.findForEnd(curNode, tree.config);
            if (!forEndNode) {
                throw new Error('the for directive is not properly ended!');
            }

            var forDirectiveParser = new ForDirectiveParser({
                startNode: curNode,
                endNode: forEndNode,
                config: tree.config,
                Tree: Tree
            });

            forDirectiveParser.collectExprs();
            container.push({parser: forDirectiveParser});

            curNode = forEndNode.nextSibling;
            continue;
        }
        else {
            var exprParser = new ExprParser({
                node: curNode,
                config: tree.config
            });
            exprParser.collectExprs();

            var con = [];
            container.push({parser: exprParser, children: con});
            if (curNode.nodeType === 1) {
                walk(tree, curNode.firstChild, curNode.lastChild, con);
            }
        }

        curNode = curNode.nextSibling;
    } while (curNode !== endNode);
}




},{"./ExprParser":2,"./ForDirectiveParser":3,"./IfDirectiveParser":4,"./utils":8}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
var Config = require('../../src/Config');
var ForDirectiveParser = require('../../src/ForDirectiveParser');
var Tree = require('../../src/Tree');

describe('ForDirectiveParser', function () {
    var config;
    var testNode;

    beforeAll(function () {
        testNode = document.getElementById('test');
        config = new Config();
    });

    afterEach(function () {
        testNode.innerHTML = '';
    });

    it('${students} as ${student}', function () {
        testNode.innerHTML = [
            '<!-- for: ${students} as ${student} -->',
                '<p>${student.name}，${student.age}</p>',
            '<!-- /for -->'
        ].join('');

        var cacheNode;

        var parser = createForDirectiveParser(testNode);
        parser.setData({
            students: [
                {
                    name: '张三',
                    age: 21
                },
                {
                    name: '李四',
                    age: 22
                },
                {
                    name: '王五',
                    age: 23
                }
            ]
        });
        expect(testNode.childNodes.length).toBe(5);
        expect(testNode.childNodes[1].innerText).toEqual('张三，21');
        expect(testNode.childNodes[2].innerText).toEqual('李四，22');
        expect(testNode.childNodes[3].innerText).toEqual('王五，23');
        cacheNode = testNode.childNodes[1];

        parser.setData({});
        expect(testNode.childNodes.length).toBe(5);
        expect(testNode.childNodes[1].style.display).toBe('none');
        expect(testNode.childNodes[2].style.display).toBe('none');
        expect(testNode.childNodes[3].style.display).toBe('none');
        expect(testNode.childNodes[1]).toBe(cacheNode);

        parser.setData({
            students: [
                {
                    name: '张三',
                    age: 21
                },
                {
                    name: '李四',
                    age: 22
                }
            ]
        });
        expect(testNode.childNodes.length).toBe(5);
        expect(testNode.childNodes[1].innerText).toEqual('张三，21');
        expect(testNode.childNodes[2].innerText).toEqual('李四，22');
        expect(testNode.childNodes[3].style.display).toBe('none');
        expect(testNode.childNodes[1]).toBe(cacheNode);
    });

    it('${students} as ${student}, ${index}, ${key}', function () {
        testNode.innerHTML = [
            '<!-- for: ${students} as ${student} -->',
                '<p>${student.name}，${student.age}，${index}，${key}</p>',
            '<!-- /for -->'
        ].join('');

        var parser = createForDirectiveParser(testNode);
        parser.setData({
            students: [
                {
                    name: '张三',
                    age: 21
                }
            ]
        });
        expect(testNode.childNodes.length).toBe(3);
        expect(testNode.childNodes[1].innerText).toEqual('张三，21，0，0');

        parser.setData({
            students: {
                '张三': {
                    name: '张三',
                    age: 21
                },
                '李四': {
                    name: '李四',
                    age: 22
                }
            }
        });
        expect(testNode.childNodes.length).toBe(4);
        expect(testNode.childNodes[1].innerText).toEqual('张三，21，0，张三');
        expect(testNode.childNodes[2].innerText).toEqual('李四，22，1，李四');
    });

    function createForDirectiveParser(node) {
        var parser = new ForDirectiveParser({
            startNode: node.firstChild,
            endNode: node.lastChild,
            config: config,
            Tree: Tree
        });
        parser.collectExprs();
        return parser;
    }
});
},{"../../src/Config":1,"../../src/ForDirectiveParser":3,"../../src/Tree":6}]},{},[9])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9Db25maWcuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvRXhwclBhcnNlci5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9Gb3JEaXJlY3RpdmVQYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvSWZEaXJlY3RpdmVQYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvUGFyc2VyLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL1RyZWUuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvaW5oZXJpdC5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3Rlc3Qvc3JjL2Zha2VfZmUzMjJhMjguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIEBmaWxlIOmFjee9rlxuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbmZ1bmN0aW9uIENvbmZpZygpIHtcbiAgICB0aGlzLmV4cHJQcmVmaXggPSAnJHsnO1xuICAgIHRoaXMuZXhwclN1ZmZpeCA9ICd9JztcblxuICAgIHRoaXMuaWZOYW1lID0gJ2lmJztcbiAgICB0aGlzLmVsaWZOYW1lID0gJ2VsaWYnO1xuICAgIHRoaXMuZWxzZU5hbWUgPSAnZWxzZSc7XG4gICAgdGhpcy5pZkVuZE5hbWUgPSAnL2lmJztcblxuICAgIHRoaXMuaWZQcmVmaXhSZWdFeHAgPSAvXlxccyppZjpcXHMqLztcbiAgICB0aGlzLmVsaWZQcmVmaXhSZWdFeHAgPSAvXlxccyplbGlmOlxccyovO1xuICAgIHRoaXMuZWxzZVByZWZpeFJlZ0V4cCA9IC9eXFxzKmVsc2VcXHMqLztcbiAgICB0aGlzLmlmRW5kUHJlZml4UmVnRXhwID0gL15cXHMqXFwvaWZcXHMqLztcblxuICAgIHRoaXMuZm9yTmFtZSA9ICdmb3InO1xuICAgIHRoaXMuZm9yRW5kTmFtZSA9ICcvZm9yJztcblxuICAgIHRoaXMuZm9yUHJlZml4UmVnRXhwID0gL15cXHMqZm9yOlxccyovO1xuICAgIHRoaXMuZm9yRW5kUHJlZml4UmVnRXhwID0gL15cXHMqXFwvZm9yXFxzKi87XG59XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0RXhwclByZWZpeCA9IGZ1bmN0aW9uIChwcmVmaXgpIHtcbiAgICB0aGlzLmV4cHJQcmVmaXggPSBwcmVmaXg7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldEV4cHJTdWZmaXggPSBmdW5jdGlvbiAoc3VmZml4KSB7XG4gICAgdGhpcy5leHByU3VmZml4ID0gc3VmZml4O1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5nZXRFeHByUmVnRXhwID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5leHByUmVnRXhwKSB7XG4gICAgICAgIHRoaXMuZXhwclJlZ0V4cCA9IG5ldyBSZWdFeHAocmVnRXhwRW5jb2RlKHRoaXMuZXhwclByZWZpeCkgKyAnKC4rPyknICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclN1ZmZpeCksICdnJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmV4cHJSZWdFeHA7XG59O1xuXG5Db25maWcucHJvdG90eXBlLmdldEFsbElmUmVnRXhwID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5hbGxJZlJlZ0V4cCkge1xuICAgICAgICB0aGlzLmFsbElmUmVnRXhwID0gbmV3IFJlZ0V4cCgnXFxcXHMqKCdcbiAgICAgICAgICAgICsgdGhpcy5pZk5hbWUgKyAnfCdcbiAgICAgICAgICAgICsgdGhpcy5lbGlmTmFtZSArICd8J1xuICAgICAgICAgICAgKyB0aGlzLmVsc2VOYW1lICsgJ3wnXG4gICAgICAgICAgICArIHRoaXMuaWZFbmROYW1lICsgJyk6XFxcXHMqJywgJ2cnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYWxsSWZSZWdFeHA7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldElmTmFtZSA9IGZ1bmN0aW9uIChpZk5hbWUpIHtcbiAgICB0aGlzLmlmTmFtZSA9IGlmTmFtZTtcbiAgICB0aGlzLmlmUHJlZml4UmVnRXhwID0gbmV3IFJlZ0V4cCgnXlxcXFxzKicgKyBpZk5hbWUgKyAnOlxcXFxzKicpO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRFbGlmTmFtZSA9IGZ1bmN0aW9uIChlbGlmTmFtZSkge1xuICAgIHRoaXMuZWxpZk5hbWUgPSBlbGlmTmFtZTtcbiAgICB0aGlzLmVsaWZQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGVsaWZOYW1lICsgJzpcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0RWxzZU5hbWUgPSBmdW5jdGlvbiAoZWxzZU5hbWUpIHtcbiAgICB0aGlzLmVsc2VOYW1lID0gZWxzZU5hbWU7XG4gICAgdGhpcy5lbHNlUHJlZml4UmVnRXhwID0gbmV3IFJlZ0V4cCgnXlxcXFxzKicgKyBlbHNlTmFtZSArICdcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0SWZFbmROYW1lID0gZnVuY3Rpb24gKGlmRW5kTmFtZSkge1xuICAgIHRoaXMuaWZFbmROYW1lID0gaWZFbmROYW1lO1xuICAgIHRoaXMuaWZFbmRQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGlmRW5kTmFtZSArICdcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0Rm9yTmFtZSA9IGZ1bmN0aW9uIChmb3JOYW1lKSB7XG4gICAgdGhpcy5mb3JOYW1lID0gZm9yTmFtZTtcbiAgICB0aGlzLmZvclByZWZpeFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15cXFxccyonICsgZm9yTmFtZSArICc6XFxcXHMqJyk7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldEZvckVuZE5hbWUgPSBmdW5jdGlvbiAoZm9yRW5kTmFtZSkge1xuICAgIHRoaXMuZm9yRW5kTmFtZSA9IGZvckVuZE5hbWU7XG4gICAgdGhpcy5mb3JFbmRQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGZvckVuZE5hbWUgKyAnXFxcXHMqJyk7XG59O1xuXG5Db25maWcucHJvdG90eXBlLmdldEZvckV4cHJzUmVnRXhwID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5mb3JFeHByc1JlZ0V4cCkge1xuICAgICAgICB0aGlzLmZvckV4cHJzUmVnRXhwID0gbmV3IFJlZ0V4cCgnXFxcXHMqJ1xuICAgICAgICAgICAgKyB0aGlzLmZvck5hbWVcbiAgICAgICAgICAgICsgJzpcXFxccyonXG4gICAgICAgICAgICArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJQcmVmaXgpXG4gICAgICAgICAgICArICcoW14nICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclN1ZmZpeClcbiAgICAgICAgICAgICsgJ10rKScgKyByZWdFeHBFbmNvZGUodGhpcy5leHByU3VmZml4KSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZvckV4cHJzUmVnRXhwO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5nZXRGb3JJdGVtVmFsdWVOYW1lUmVnRXhwID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5mb3JJdGVtVmFsdWVOYW1lUmVnRXhwKSB7XG4gICAgICAgIHRoaXMuZm9ySXRlbVZhbHVlTmFtZVJlZ0V4cCA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgICAnYXNcXFxccyonICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclByZWZpeClcbiAgICAgICAgICAgICsgJyhbXicgKyByZWdFeHBFbmNvZGUodGhpcy5leHByU3VmZml4KSArICddKyknXG4gICAgICAgICAgICArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJTdWZmaXgpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZvckl0ZW1WYWx1ZU5hbWVSZWdFeHA7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbmZpZztcblxuZnVuY3Rpb24gcmVnRXhwRW5jb2RlKHN0cikge1xuICAgIHJldHVybiAnXFxcXCcgKyBzdHIuc3BsaXQoJycpLmpvaW4oJ1xcXFwnKTtcbn1cbiIsIi8qKlxuICogQGZpbGUg6KGo6L6+5byP6Kej5p6Q5Zmo77yM5LiA5Liq5paH5pys6IqC54K55oiW6ICF5YWD57Sg6IqC54K55a+55bqU5LiA5Liq6KGo6L6+5byP6Kej5p6Q5Zmo5a6e5L6LXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxudmFyIFBhcnNlciA9IHJlcXVpcmUoJy4vUGFyc2VyJyk7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJy4vaW5oZXJpdCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBFeHByUGFyc2VyKG9wdGlvbnMpIHtcbiAgICBQYXJzZXIuY2FsbCh0aGlzLCBvcHRpb25zKTtcbn1cblxuRXhwclBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdGhpcy5ub2RlID0gb3B0aW9ucy5ub2RlO1xuICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG5cbiAgICB0aGlzLmV4cHJzID0gW107XG4gICAgdGhpcy5leHByRm5zID0ge307XG4gICAgdGhpcy51cGRhdGVGbnMgPSB7fTtcbiAgICB0aGlzLmV4cHJPbGRWYWx1ZXMgPSB7fTtcbn07XG5cbkV4cHJQYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyTm9kZSA9IHRoaXMubm9kZTtcblxuICAgIC8vIOaWh+acrOiKgueCuVxuICAgIGlmIChjdXJOb2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIGFkZEV4cHIodGhpcywgY3VyTm9kZS5ub2RlVmFsdWUsIChmdW5jdGlvbiAoY3VyTm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChleHByVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBjdXJOb2RlLm5vZGVWYWx1ZSA9IGV4cHJWYWx1ZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pKGN1ck5vZGUpKTtcbiAgICB9XG4gICAgLy8g5YWD57Sg6IqC54K5XG4gICAgZWxzZSBpZiAoY3VyTm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICB2YXIgYXR0cmlidXRlcyA9IGN1ck5vZGUuYXR0cmlidXRlcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlsID0gYXR0cmlidXRlcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYXR0ciA9IGF0dHJpYnV0ZXNbaV07XG4gICAgICAgICAgICBhZGRFeHByKHRoaXMsIGF0dHIudmFsdWUsIGNyZWF0ZUF0dHJVcGRhdGVGbihhdHRyKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVBdHRyVXBkYXRlRm4oYXR0cikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGV4cHJWYWx1ZSkge1xuICAgICAgICAgICAgYXR0ci52YWx1ZSA9IGV4cHJWYWx1ZTtcbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG5FeHByUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgZXhwcnMgPSB0aGlzLmV4cHJzO1xuICAgIHZhciBleHByT2xkVmFsdWVzID0gdGhpcy5leHByT2xkVmFsdWVzO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGV4cHJzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgdmFyIGV4cHIgPSBleHByc1tpXTtcbiAgICAgICAgdmFyIGV4cHJWYWx1ZSA9IHRoaXMuZXhwckZuc1tleHByXShkYXRhKTtcblxuICAgICAgICBpZiAodGhpcy5kaXJ0eUNoZWNrKGV4cHIsIGV4cHJWYWx1ZSwgZXhwck9sZFZhbHVlc1tleHByXSkpIHtcbiAgICAgICAgICAgIHZhciB1cGRhdGVGbnMgPSB0aGlzLnVwZGF0ZUZuc1tleHByXTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwLCBqbCA9IHVwZGF0ZUZucy5sZW5ndGg7IGogPCBqbDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlRm5zW2pdKGV4cHJWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHByT2xkVmFsdWVzW2V4cHJdID0gZXhwclZhbHVlO1xuICAgIH1cbn07XG5cbkV4cHJQYXJzZXIucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy5nb0RhcmsodGhpcy5ub2RlKTtcbn07XG5cbkV4cHJQYXJzZXIucHJvdG90eXBlLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy5yZXN0b3JlRnJvbURhcmsodGhpcy5ub2RlKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0KEV4cHJQYXJzZXIsIFBhcnNlcik7XG5cbmZ1bmN0aW9uIGFkZEV4cHIocGFyc2VyLCBleHByLCB1cGRhdGVGbikge1xuICAgIHBhcnNlci5leHBycy5wdXNoKGV4cHIpO1xuICAgIGlmICghcGFyc2VyLmV4cHJGbnNbZXhwcl0pIHtcbiAgICAgICAgcGFyc2VyLmV4cHJGbnNbZXhwcl0gPSBjcmVhdGVFeHByRm4ocGFyc2VyLmNvbmZpZy5nZXRFeHByUmVnRXhwKCksIGV4cHIpO1xuICAgIH1cbiAgICBwYXJzZXIudXBkYXRlRm5zW2V4cHJdID0gcGFyc2VyLnVwZGF0ZUZuc1tleHByXSB8fCBbXTtcbiAgICBwYXJzZXIudXBkYXRlRm5zW2V4cHJdLnB1c2godXBkYXRlRm4pO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFeHByRm4oZXhwclJlZ0V4cCwgZXhwcikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICByZXR1cm4gZXhwci5yZXBsYWNlKGV4cHJSZWdFeHAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB1dGlscy5jYWxjdWxhdGVFeHByZXNzaW9uKGFyZ3VtZW50c1sxXSwgZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG4iLCIvKipcbiAqIEBmaWxlIGZvciDmjIfku6RcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJy4vaW5oZXJpdCcpO1xudmFyIFBhcnNlciA9IHJlcXVpcmUoJy4vUGFyc2VyJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIEZvckRpcmVjdGl2ZVBhcnNlcihvcHRpb25zKSB7XG4gICAgUGFyc2VyLmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG5cbkZvckRpcmVjdGl2ZVBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdGhpcy5zdGFydE5vZGUgPSBvcHRpb25zLnN0YXJ0Tm9kZTtcbiAgICB0aGlzLmVuZE5vZGUgPSBvcHRpb25zLmVuZE5vZGU7XG4gICAgdGhpcy5jb25maWcgPSBvcHRpb25zLmNvbmZpZztcbiAgICB0aGlzLlRyZWUgPSBvcHRpb25zLlRyZWU7XG59O1xuXG5Gb3JEaXJlY3RpdmVQYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5zdGFydE5vZGUubmV4dFNpYmxpbmcgPT09IHRoaXMuZW5kTm9kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHRwbFNlZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHV0aWxzLnRyYXZlcnNlTm9kZXModGhpcy5zdGFydE5vZGUsIHRoaXMuZW5kTm9kZSwgZnVuY3Rpb24gKGN1ck5vZGUpIHtcbiAgICAgICAgaWYgKGN1ck5vZGUgPT09IHRoaXMuc3RhcnROb2RlIHx8IGN1ck5vZGUgPT09IHRoaXMuZW5kTm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdHBsU2VnLmFwcGVuZENoaWxkKGN1ck5vZGUpO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMudHBsU2VnID0gdHBsU2VnO1xuXG4gICAgdGhpcy5leHByID0gdGhpcy5zdGFydE5vZGUubm9kZVZhbHVlLm1hdGNoKHRoaXMuY29uZmlnLmdldEZvckV4cHJzUmVnRXhwKCkpWzFdO1xuICAgIHRoaXMuZXhwckZuID0gdXRpbHMuY3JlYXRlRXhwckZuKHRoaXMuY29uZmlnLmdldEV4cHJSZWdFeHAoKSwgdGhpcy5leHByKTtcbiAgICB0aGlzLnVwZGF0ZUZuID0gY3JlYXRlVXBkYXRlRm4oXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHRoaXMuVHJlZSxcbiAgICAgICAgdGhpcy5zdGFydE5vZGUubmV4dFNpYmxpbmcsXG4gICAgICAgIHRoaXMuZW5kTm9kZS5wcmV2aW91c1NpYmxpbmcsXG4gICAgICAgIHRoaXMuY29uZmlnLFxuICAgICAgICB0aGlzLnN0YXJ0Tm9kZS5ub2RlVmFsdWVcbiAgICApO1xufTtcblxuRm9yRGlyZWN0aXZlUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoIXRoaXMuZXhwcikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGV4cHJWYWx1ZSA9IHRoaXMuZXhwckZuKGRhdGEpO1xuICAgIGlmICh0aGlzLmRpcnR5Q2hlY2sodGhpcy5leHByLCBleHByVmFsdWUsIHRoaXMuZXhwck9sZFZhbHVlKSkge1xuICAgICAgICB0aGlzLnVwZGF0ZUZuKGV4cHJWYWx1ZSwgZGF0YSk7XG4gICAgfVxuXG4gICAgdGhpcy5leHByT2xkVmFsdWUgPSBleHByVmFsdWU7XG59O1xuXG5Gb3JEaXJlY3RpdmVQYXJzZXIuaXNGb3JOb2RlID0gZnVuY3Rpb24gKG5vZGUsIGNvbmZpZykge1xuICAgIHJldHVybiBub2RlLm5vZGVUeXBlID09PSA4ICYmIGNvbmZpZy5mb3JQcmVmaXhSZWdFeHAudGVzdChub2RlLm5vZGVWYWx1ZSk7XG59O1xuXG5Gb3JEaXJlY3RpdmVQYXJzZXIuaXNGb3JFbmROb2RlID0gZnVuY3Rpb24gKG5vZGUsIGNvbmZpZykge1xuICAgIHJldHVybiBub2RlLm5vZGVUeXBlID09PSA4ICYmIGNvbmZpZy5mb3JFbmRQcmVmaXhSZWdFeHAudGVzdChub2RlLm5vZGVWYWx1ZSk7XG59O1xuXG5Gb3JEaXJlY3RpdmVQYXJzZXIuZmluZEZvckVuZCA9IGZ1bmN0aW9uIChmb3JTdGFydE5vZGUsIGNvbmZpZykge1xuICAgIHZhciBjdXJOb2RlID0gZm9yU3RhcnROb2RlO1xuICAgIHdoaWxlICgoY3VyTm9kZSA9IGN1ck5vZGUubmV4dFNpYmxpbmcpKSB7XG4gICAgICAgIGlmIChGb3JEaXJlY3RpdmVQYXJzZXIuaXNGb3JFbmROb2RlKGN1ck5vZGUsIGNvbmZpZykpIHtcbiAgICAgICAgICAgIHJldHVybiBjdXJOb2RlO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0KEZvckRpcmVjdGl2ZVBhcnNlciwgUGFyc2VyKTtcblxuZnVuY3Rpb24gY3JlYXRlVXBkYXRlRm4ocGFyc2VyLCBUcmVlLCBzdGFydE5vZGUsIGVuZE5vZGUsIGNvbmZpZywgZnVsbEV4cHIpIHtcbiAgICB2YXIgdHJlZXMgPSBbXTtcbiAgICB2YXIgaXRlbVZhcmlhYmxlTmFtZSA9IGZ1bGxFeHByLm1hdGNoKHBhcnNlci5jb25maWcuZ2V0Rm9ySXRlbVZhbHVlTmFtZVJlZ0V4cCgpKVsxXTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGV4cHJWYWx1ZSwgZGF0YSkge1xuICAgICAgICB2YXIgaW5kZXggPSAwO1xuICAgICAgICBmb3IgKHZhciBrIGluIGV4cHJWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKCF0cmVlc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgICB0cmVlc1tpbmRleF0gPSBjcmVhdGVUcmVlKHBhcnNlciwgVHJlZSwgY29uZmlnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdHJlZXNbaW5kZXhdLnJlc3RvcmVGcm9tRGFyaygpO1xuICAgICAgICAgICAgdHJlZXNbaW5kZXhdLnNldERpcnR5Q2hlY2tlcihwYXJzZXIuZGlydHlDaGVja2VyKTtcblxuICAgICAgICAgICAgdmFyIGxvY2FsID0ge1xuICAgICAgICAgICAgICAgIGtleTogayxcbiAgICAgICAgICAgICAgICBpbmRleDogaW5kZXhcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBsb2NhbFtpdGVtVmFyaWFibGVOYW1lXSA9IGV4cHJWYWx1ZVtrXTtcbiAgICAgICAgICAgIHRyZWVzW2luZGV4XS5zZXREYXRhKHV0aWxzLmV4dGVuZCh7fSwgZGF0YSwgbG9jYWwpKTtcblxuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSBpbmRleCwgaWwgPSB0cmVlcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgICAgICB0cmVlc1tpXS5nb0RhcmsoKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRyZWUocGFyc2VyLCBUcmVlLCBjb25maWcpIHtcbiAgICB2YXIgY29weVNlZyA9IHBhcnNlci50cGxTZWcuY2xvbmVOb2RlKHRydWUpO1xuICAgIHZhciBzdGFydE5vZGUgPSBjb3B5U2VnLmZpcnN0Q2hpbGQ7XG4gICAgdmFyIGVuZE5vZGUgPSBjb3B5U2VnLmxhc3RDaGlsZDtcbiAgICB1dGlscy50cmF2ZXJzZU5vZGVzKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgZnVuY3Rpb24gKGN1ck5vZGUpIHtcbiAgICAgICAgcGFyc2VyLmVuZE5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoY3VyTm9kZSwgcGFyc2VyLmVuZE5vZGUpO1xuICAgIH0pO1xuXG4gICAgdmFyIHRyZWUgPSBuZXcgVHJlZSh7XG4gICAgICAgIHN0YXJ0Tm9kZTogc3RhcnROb2RlLFxuICAgICAgICBlbmROb2RlOiBlbmROb2RlLFxuICAgICAgICBjb25maWc6IGNvbmZpZ1xuICAgIH0pO1xuICAgIHRyZWUudHJhdmVyc2UoKTtcbiAgICByZXR1cm4gdHJlZTtcbn1cbiIsIi8qKlxuICogQGZpbGUgaWYg5oyH5LukXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxudmFyIFBhcnNlciA9IHJlcXVpcmUoJy4vUGFyc2VyJyk7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJy4vaW5oZXJpdCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBJZkRpcmVjdGl2ZVBhcnNlcihvcHRpb25zKSB7XG4gICAgUGFyc2VyLmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG5cbklmRGlyZWN0aXZlUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB0aGlzLnN0YXJ0Tm9kZSA9IG9wdGlvbnMuc3RhcnROb2RlO1xuICAgIHRoaXMuZW5kTm9kZSA9IG9wdGlvbnMuZW5kTm9kZTtcbiAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xuXG4gICAgdGhpcy5leHBycyA9IFtdO1xuICAgIHRoaXMuZXhwckZucyA9IHt9O1xufTtcblxuSWZEaXJlY3RpdmVQYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyTm9kZSA9IHRoaXMuc3RhcnROb2RlO1xuICAgIHZhciBicmFuY2hlcyA9IFtdO1xuICAgIHZhciBicmFuY2hJbmRleCA9IC0xO1xuICAgIGRvIHtcbiAgICAgICAgdmFyIG5vZGVUeXBlID0gZ2V0SWZOb2RlVHlwZShjdXJOb2RlLCB0aGlzLmNvbmZpZyk7XG5cbiAgICAgICAgaWYgKG5vZGVUeXBlKSB7XG4gICAgICAgICAgICBzZXRFbmROb2RlKGN1ck5vZGUsIGJyYW5jaGVzLCBicmFuY2hJbmRleCk7XG5cbiAgICAgICAgICAgIGJyYW5jaEluZGV4Kys7XG4gICAgICAgICAgICBicmFuY2hlc1ticmFuY2hJbmRleF0gPSBicmFuY2hlc1ticmFuY2hJbmRleF0gfHwge307XG5cbiAgICAgICAgICAgIC8vIOaYryBpZiDoioLngrnmiJbogIUgZWxpZiDoioLngrnvvIzmkJzpm4booajovr7lvI9cbiAgICAgICAgICAgIGlmIChub2RlVHlwZSA8IDMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhwciA9IGN1ck5vZGUubm9kZVZhbHVlLnJlcGxhY2UodGhpcy5jb25maWcuZ2V0QWxsSWZSZWdFeHAoKSwgJycpO1xuICAgICAgICAgICAgICAgIHRoaXMuZXhwcnMucHVzaChleHByKTtcblxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5leHByRm5zW2V4cHJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXhwckZuc1tleHByXSA9IHV0aWxzLmNyZWF0ZUV4cHJGbih0aGlzLmNvbmZpZy5nZXRFeHByUmVnRXhwKCksIGV4cHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmICghYnJhbmNoZXNbYnJhbmNoSW5kZXhdLnN0YXJ0Tm9kZSkge1xuICAgICAgICAgICAgICAgIGJyYW5jaGVzW2JyYW5jaEluZGV4XS5zdGFydE5vZGUgPSBjdXJOb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY3VyTm9kZSA9IGN1ck5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgIGlmICghY3VyTm9kZSB8fCBjdXJOb2RlID09PSB0aGlzLmVuZE5vZGUpIHtcbiAgICAgICAgICAgIHNldEVuZE5vZGUoY3VyTm9kZSwgYnJhbmNoZXMsIGJyYW5jaEluZGV4KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSB3aGlsZSAodHJ1ZSk7XG5cbiAgICByZXR1cm4gYnJhbmNoZXM7XG5cbiAgICBmdW5jdGlvbiBzZXRFbmROb2RlKGN1ck5vZGUsIGJyYW5jaGVzLCBicmFuY2hJbmRleCkge1xuICAgICAgICBpZiAoYnJhbmNoSW5kZXggKyAxICYmIGJyYW5jaGVzW2JyYW5jaEluZGV4XS5zdGFydE5vZGUpIHtcbiAgICAgICAgICAgIGJyYW5jaGVzW2JyYW5jaEluZGV4XS5lbmROb2RlID0gY3VyTm9kZS5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5JZkRpcmVjdGl2ZVBhcnNlci5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGV4cHJzID0gdGhpcy5leHBycztcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBleHBycy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIHZhciBleHByID0gZXhwcnNbaV07XG4gICAgICAgIHZhciBleHByVmFsdWUgPSB0aGlzLmV4cHJGbnNbZXhwcl0oZGF0YSk7XG4gICAgICAgIGlmIChleHByVmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuSWZEaXJlY3RpdmVQYXJzZXIuaXNJZk5vZGUgPSBmdW5jdGlvbiAobm9kZSwgY29uZmlnKSB7XG4gICAgcmV0dXJuIGdldElmTm9kZVR5cGUobm9kZSwgY29uZmlnKSA9PT0gMTtcbn07XG5cbklmRGlyZWN0aXZlUGFyc2VyLmlzRWxpZk5vZGUgPSBmdW5jdGlvbiAobm9kZSwgY29uZmlnKSB7XG4gICAgcmV0dXJuIGdldElmTm9kZVR5cGUobm9kZSwgY29uZmlnKSA9PT0gMjtcbn07XG5cbklmRGlyZWN0aXZlUGFyc2VyLmlzRWxzZU5vZGUgPSBmdW5jdGlvbiAobm9kZSwgY29uZmlnKSB7XG4gICAgcmV0dXJuIGdldElmTm9kZVR5cGUobm9kZSwgY29uZmlnKSA9PT0gMztcbn07XG5cbklmRGlyZWN0aXZlUGFyc2VyLmlzSWZFbmROb2RlID0gZnVuY3Rpb24gKG5vZGUsIGNvbmZpZykge1xuICAgIHJldHVybiBnZXRJZk5vZGVUeXBlKG5vZGUsIGNvbmZpZykgPT09IDQ7XG59O1xuXG5JZkRpcmVjdGl2ZVBhcnNlci5maW5kSWZFbmQgPSBmdW5jdGlvbiAoaWZTdGFydE5vZGUsIGNvbmZpZykge1xuICAgIHZhciBjdXJOb2RlID0gaWZTdGFydE5vZGU7XG4gICAgd2hpbGUgKChjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZykpIHtcbiAgICAgICAgaWYgKElmRGlyZWN0aXZlUGFyc2VyLmlzSWZFbmROb2RlKGN1ck5vZGUsIGNvbmZpZykpIHtcbiAgICAgICAgICAgIHJldHVybiBjdXJOb2RlO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0KElmRGlyZWN0aXZlUGFyc2VyLCBQYXJzZXIpO1xuXG5mdW5jdGlvbiBnZXRJZk5vZGVUeXBlKG5vZGUsIGNvbmZpZykge1xuICAgIGlmIChub2RlLm5vZGVUeXBlICE9PSA4KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLmlmUHJlZml4UmVnRXhwLnRlc3Qobm9kZS5ub2RlVmFsdWUpKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGlmIChjb25maWcuZWxpZlByZWZpeFJlZ0V4cC50ZXN0KG5vZGUubm9kZVZhbHVlKSkge1xuICAgICAgICByZXR1cm4gMjtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLmVsc2VQcmVmaXhSZWdFeHAudGVzdChub2RlLm5vZGVWYWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIDM7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5pZkVuZFByZWZpeFJlZ0V4cC50ZXN0KG5vZGUubm9kZVZhbHVlKSkge1xuICAgICAgICByZXR1cm4gNDtcbiAgICB9XG59XG4iLCIvKipcbiAqIEBmaWxlIOino+aekOWZqOeahOaKveixoeWfuuexu1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbi8qKlxuICog5p6E6YCg5Ye95pWwXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDphY3nva7lj4LmlbDvvIzkuIDoiKzlj6/og73kvJrmnInlpoLkuIvlhoXlrrnvvJpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydE5vZGU6IC4uLixcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmROb2RlOiAuLi4sXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogLi4uLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZzogLi4uXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICDlhbfkvZPmmK/llaXlj6/ku6Xlj4LliqDlhbfkvZPnmoTlrZDnsbtcbiAqL1xuZnVuY3Rpb24gUGFyc2VyKG9wdGlvbnMpIHtcbiAgICB0aGlzLmluaXRpYWxpemUob3B0aW9ucyk7XG59XG5cbi8qKlxuICog5Yid5aeL5YyWXG4gKlxuICogQHByb3RlY3RlZFxuICogQGFic3RyYWN0XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDmnaXoh6rkuo7mnoTpgKDlh73mlbBcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHt9O1xuXG4vKipcbiAqIOmUgOavgeino+aekOWZqFxuICpcbiAqIEBwdWJsaWNcbiAqIEBhYnN0cmFjdFxuICovXG5QYXJzZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDorr7nva7mlbDmja5cbiAqXG4gKiBAcHVibGljXG4gKiBAYWJzdHJhY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIOimgeiuvue9rueahOaVsOaNrlxuICovXG5QYXJzZXIucHJvdG90eXBlLnNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge307XG5cbi8qKlxuICog6ZqQ6JeP55u45YWz5YWD57SgXG4gKlxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vKipcbiAqIOaYvuekuuebuOWFs+WFg+e0oFxuICpcbiAqIEBwdWJsaWNcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDmkJzpm4booajovr7lvI/vvIznlJ/miJDooajovr7lvI/lh73mlbDlkowgRE9NIOabtOaWsOWHveaVsFxuICpcbiAqIEBhYnN0cmFjdFxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHt9O1xuXG5QYXJzZXIucHJvdG90eXBlLmRpcnR5Q2hlY2sgPSBmdW5jdGlvbiAoZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWUpIHtcbiAgICB2YXIgZGlydHlDaGVja2VyRm4gPSB0aGlzLmRpcnR5Q2hlY2tlciA/IHRoaXMuZGlydHlDaGVja2VyLmdldENoZWNrZXIoZXhwcikgOiBudWxsO1xuICAgIHJldHVybiAoZGlydHlDaGVja2VyRm4gJiYgZGlydHlDaGVja2VyRm4oZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWUpKVxuICAgICAgICAgICAgfHwgKCFkaXJ0eUNoZWNrZXJGbiAmJiBleHByVmFsdWUgIT09IGV4cHJPbGRWYWx1ZSk7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLnNldERpcnR5Q2hlY2tlciA9IGZ1bmN0aW9uIChkaXJ0eUNoZWNrZXIpIHtcbiAgICB0aGlzLmRpcnR5Q2hlY2tlciA9IGRpcnR5Q2hlY2tlcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGFyc2VyO1xuIiwiLyoqXG4gKiBAZmlsZSDmnIDnu4jnmoTmoJFcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG52YXIgSWZEaXJlY3RpdmVQYXJzZXIgPSByZXF1aXJlKCcuL0lmRGlyZWN0aXZlUGFyc2VyJyk7XG52YXIgRXhwclBhcnNlciA9IHJlcXVpcmUoJy4vRXhwclBhcnNlcicpO1xudmFyIEZvckRpcmVjdGl2ZVBhcnNlciA9IHJlcXVpcmUoJy4vRm9yRGlyZWN0aXZlUGFyc2VyJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIFRyZWUob3B0aW9ucykge1xuICAgIHRoaXMuc3RhcnROb2RlID0gb3B0aW9ucy5zdGFydE5vZGU7XG4gICAgdGhpcy5lbmROb2RlID0gb3B0aW9ucy5lbmROb2RlO1xuICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG5cbiAgICB0aGlzLnRyZWUgPSBbXTtcbn1cblxuVHJlZS5wcm90b3R5cGUudHJhdmVyc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgd2Fsayh0aGlzLCB0aGlzLnN0YXJ0Tm9kZSwgdGhpcy5lbmROb2RlLCB0aGlzLnRyZWUpO1xufTtcblxuVHJlZS5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgZGF0YSA9IGRhdGEgfHwge307XG4gICAgd2Fsa1BhcnNlcnModGhpcywgdGhpcy50cmVlLCBkYXRhKTtcbn07XG5cblRyZWUucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyTm9kZSA9IHRoaXMuc3RhcnROb2RlO1xuICAgIGRvIHtcbiAgICAgICAgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDEgfHwgY3VyTm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICAgICAgdXRpbHMuZ29EYXJrKGN1ck5vZGUpO1xuICAgICAgICB9XG4gICAgfSB3aGlsZSAoKGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nKSAmJiBjdXJOb2RlICE9PSB0aGlzLmVuZE5vZGUpO1xufTtcblxuVHJlZS5wcm90b3R5cGUucmVzdG9yZUZyb21EYXJrID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJOb2RlID0gdGhpcy5zdGFydE5vZGU7XG4gICAgZG8ge1xuICAgICAgICBpZiAoY3VyTm9kZS5ub2RlVHlwZSA9PT0gMSB8fCBjdXJOb2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgICAgICB1dGlscy5yZXN0b3JlRnJvbURhcmsoY3VyTm9kZSk7XG4gICAgICAgIH1cbiAgICB9IHdoaWxlICgoY3VyTm9kZSA9IGN1ck5vZGUubmV4dFNpYmxpbmcpICYmIGN1ck5vZGUgIT09IHRoaXMuZW5kTm9kZSk7XG59O1xuXG5UcmVlLnByb3RvdHlwZS5zZXREaXJ0eUNoZWNrZXIgPSBmdW5jdGlvbiAoZGlydHlDaGVja2VyKSB7XG4gICAgdGhpcy5kaXJ0eUNoZWNrZXIgPSBkaXJ0eUNoZWNrZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyZWU7XG5cbmZ1bmN0aW9uIHdhbGtQYXJzZXJzKHRyZWUsIHBhcnNlcnMsIGRhdGEpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBwYXJzZXJzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcnNlck9iaiA9IHBhcnNlcnNbaV07XG4gICAgICAgIHBhcnNlck9iai5wYXJzZXIuc2V0RGlydHlDaGVja2VyKHRyZWUuZGlydHlDaGVja2VyKTtcbiAgICAgICAgcGFyc2VyT2JqLmRhdGEgPSB1dGlscy5leHRlbmQoe30sIHBhcnNlck9iai5kYXRhIHx8IHt9LCBkYXRhKTtcblxuICAgICAgICBpZiAocGFyc2VyT2JqLnBhcnNlciBpbnN0YW5jZW9mIElmRGlyZWN0aXZlUGFyc2VyKSB7XG4gICAgICAgICAgICB2YXIgYnJhbmNoSW5kZXggPSBwYXJzZXJPYmoucGFyc2VyLnNldERhdGEocGFyc2VyT2JqLmRhdGEpO1xuICAgICAgICAgICAgdmFyIGJyYW5jaGVzID0gcGFyc2VyT2JqLmNoaWxkcmVuO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDAsIGpsID0gYnJhbmNoZXMubGVuZ3RoOyBqIDwgamw7IGorKykge1xuICAgICAgICAgICAgICAgIGlmIChqID09PSBicmFuY2hJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICB3YWxrUGFyc2Vycyh0cmVlLCBicmFuY2hlc1tqXSwgcGFyc2VyT2JqLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciB6ID0gMCwgemwgPSBicmFuY2hlc1tqXS5sZW5ndGg7IHogPCB6bDsgeisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChicmFuY2hlc1tqXVt6XS5wYXJzZXIgaW5zdGFuY2VvZiBFeHByUGFyc2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmFuY2hlc1tqXVt6XS5wYXJzZXIuZ29EYXJrKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAocGFyc2VyT2JqLnBhcnNlciBpbnN0YW5jZW9mIEV4cHJQYXJzZXIpIHtcbiAgICAgICAgICAgICAgICBwYXJzZXJPYmoucGFyc2VyLnJlc3RvcmVGcm9tRGFyaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGFyc2VyT2JqLnBhcnNlci5zZXREYXRhKHBhcnNlck9iai5kYXRhKTtcbiAgICAgICAgICAgIGlmIChwYXJzZXJPYmouY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICB3YWxrUGFyc2Vycyh0cmVlLCBwYXJzZXJPYmouY2hpbGRyZW4sIHBhcnNlck9iai5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gd2Fsayh0cmVlLCBzdGFydE5vZGUsIGVuZE5vZGUsIGNvbnRhaW5lcikge1xuICAgIHZhciBjdXJOb2RlID0gc3RhcnROb2RlO1xuICAgIGRvIHtcbiAgICAgICAgaWYgKCFjdXJOb2RlKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChJZkRpcmVjdGl2ZVBhcnNlci5pc0lmTm9kZShjdXJOb2RlLCB0cmVlLmNvbmZpZykpIHtcbiAgICAgICAgICAgIHZhciBpZkVuZE5vZGUgPSBJZkRpcmVjdGl2ZVBhcnNlci5maW5kSWZFbmQoY3VyTm9kZSwgdHJlZS5jb25maWcpO1xuICAgICAgICAgICAgaWYgKCFpZkVuZE5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RoZSBpZiBkaXJlY3RpdmUgaXMgbm90IHByb3Blcmx5IGVuZGVkIScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaWZEaXJlY3RpdmVQYXJzZXIgPSBuZXcgSWZEaXJlY3RpdmVQYXJzZXIoe1xuICAgICAgICAgICAgICAgIHN0YXJ0Tm9kZTogY3VyTm9kZSxcbiAgICAgICAgICAgICAgICBlbmROb2RlOiBpZkVuZE5vZGUsXG4gICAgICAgICAgICAgICAgY29uZmlnOiB0cmVlLmNvbmZpZ1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBicmFuY2hlcyA9IGlmRGlyZWN0aXZlUGFyc2VyLmNvbGxlY3RFeHBycygpO1xuICAgICAgICAgICAgY29udGFpbmVyLnB1c2goe3BhcnNlcjogaWZEaXJlY3RpdmVQYXJzZXIsIGNoaWxkcmVuOiBicmFuY2hlc30pO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlsID0gYnJhbmNoZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICghYnJhbmNoZXNbaV0uc3RhcnROb2RlIHx8ICFicmFuY2hlc1tpXS5lbmROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBpZkNvbiA9IFtdO1xuICAgICAgICAgICAgICAgIHdhbGsodHJlZSwgYnJhbmNoZXNbaV0uc3RhcnROb2RlLCBicmFuY2hlc1tpXS5lbmROb2RlLCBpZkNvbik7XG4gICAgICAgICAgICAgICAgYnJhbmNoZXNbaV0gPSBpZkNvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY3VyTm9kZSA9IGlmRW5kTm9kZS5uZXh0U2libGluZztcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKEZvckRpcmVjdGl2ZVBhcnNlci5pc0Zvck5vZGUoY3VyTm9kZSwgdHJlZS5jb25maWcpKSB7XG4gICAgICAgICAgICB2YXIgZm9yRW5kTm9kZSA9IEZvckRpcmVjdGl2ZVBhcnNlci5maW5kRm9yRW5kKGN1ck5vZGUsIHRyZWUuY29uZmlnKTtcbiAgICAgICAgICAgIGlmICghZm9yRW5kTm9kZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndGhlIGZvciBkaXJlY3RpdmUgaXMgbm90IHByb3Blcmx5IGVuZGVkIScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZm9yRGlyZWN0aXZlUGFyc2VyID0gbmV3IEZvckRpcmVjdGl2ZVBhcnNlcih7XG4gICAgICAgICAgICAgICAgc3RhcnROb2RlOiBjdXJOb2RlLFxuICAgICAgICAgICAgICAgIGVuZE5vZGU6IGZvckVuZE5vZGUsXG4gICAgICAgICAgICAgICAgY29uZmlnOiB0cmVlLmNvbmZpZyxcbiAgICAgICAgICAgICAgICBUcmVlOiBUcmVlXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZm9yRGlyZWN0aXZlUGFyc2VyLmNvbGxlY3RFeHBycygpO1xuICAgICAgICAgICAgY29udGFpbmVyLnB1c2goe3BhcnNlcjogZm9yRGlyZWN0aXZlUGFyc2VyfSk7XG5cbiAgICAgICAgICAgIGN1ck5vZGUgPSBmb3JFbmROb2RlLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZXhwclBhcnNlciA9IG5ldyBFeHByUGFyc2VyKHtcbiAgICAgICAgICAgICAgICBub2RlOiBjdXJOb2RlLFxuICAgICAgICAgICAgICAgIGNvbmZpZzogdHJlZS5jb25maWdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZXhwclBhcnNlci5jb2xsZWN0RXhwcnMoKTtcblxuICAgICAgICAgICAgdmFyIGNvbiA9IFtdO1xuICAgICAgICAgICAgY29udGFpbmVyLnB1c2goe3BhcnNlcjogZXhwclBhcnNlciwgY2hpbGRyZW46IGNvbn0pO1xuICAgICAgICAgICAgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgICAgICAgICB3YWxrKHRyZWUsIGN1ck5vZGUuZmlyc3RDaGlsZCwgY3VyTm9kZS5sYXN0Q2hpbGQsIGNvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZztcbiAgICB9IHdoaWxlIChjdXJOb2RlICE9PSBlbmROb2RlKTtcbn1cblxuXG5cbiIsImZ1bmN0aW9uIGluaGVyaXQoQ2hpbGRDbGFzcywgUGFyZW50Q2xhc3MpIHtcbiAgICB2YXIgY2hpbGRQcm90byA9IENoaWxkQ2xhc3MucHJvdG90eXBlO1xuICAgIENoaWxkQ2xhc3MucHJvdG90eXBlID0gbmV3IFBhcmVudENsYXNzKCk7XG4gICAgZm9yICh2YXIga2V5IGluIGNoaWxkUHJvdG8pIHtcbiAgICAgICAgaWYgKGNoaWxkUHJvdG8uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgQ2hpbGRDbGFzcy5wcm90b3R5cGVba2V5XSA9IGNoaWxkUHJvdG9ba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gQ2hpbGRDbGFzcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0OyIsImV4cG9ydHMuc2xpY2UgPSBmdW5jdGlvbiAoYXJyLCBzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyciwgc3RhcnQsIGVuZCk7XG59O1xuXG4vKipcbiAqIOiuoeeul+ihqOi+vuW8j+eahOWAvFxuICpcbiAqIEBpbm5lclxuICogQHBhcmFtICB7c3RyaW5nfSBleHByZXNzaW9uIOihqOi+vuW8j+Wtl+espuS4su+8jOexu+S8vOS6jiBgJHtuYW1lfWAg5Lit55qEIG5hbWVcbiAqIEBwYXJhbSAge09iamVjdH0gY3VyRGF0YSAgICDlvZPliY3ooajovr7lvI/lr7nlupTnmoTmlbDmja5cbiAqIEByZXR1cm4ge3N0cmluZ30gICAgICAgICAgICDorqHnrpfnu5PmnpxcbiAqL1xuZXhwb3J0cy5jYWxjdWxhdGVFeHByZXNzaW9uID0gZnVuY3Rpb24gKGV4cHJlc3Npb24sIGN1ckRhdGEpIHtcbiAgICB2YXIgcGFyYW1zID0gZ2V0VmFyaWFibGVOYW1lc0Zyb21FeHByKGV4cHJlc3Npb24pO1xuXG4gICAgdmFyIGZuQXJncyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IHBhcmFtcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIHZhciBwYXJhbSA9IHBhcmFtc1tpXTtcbiAgICAgICAgdmFyIHZhbHVlID0gY3VyRGF0YVtwYXJhbV07XG4gICAgICAgIGZuQXJncy5wdXNoKHZhbHVlID09PSB1bmRlZmluZWQgPyAnJyA6IHZhbHVlKTtcbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0O1xuICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IChuZXcgRnVuY3Rpb24ocGFyYW1zLCAncmV0dXJuICcgKyBleHByZXNzaW9uKSkuYXBwbHkobnVsbCwgZm5BcmdzKTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVzdWx0ID0gJyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbmV4cG9ydHMuZ29EYXJrID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICBub2RlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgbm9kZS5fX3RleHRfXyA9IG5vZGUubm9kZVZhbHVlO1xuICAgICAgICBub2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgIH1cbn07XG5cbmV4cG9ydHMucmVzdG9yZUZyb21EYXJrID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICBub2RlLnN0eWxlLmRpc3BsYXkgPSBudWxsO1xuICAgIH1cbiAgICBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIGlmIChub2RlLl9fdGV4dF9fICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIG5vZGUubm9kZVZhbHVlID0gbm9kZS5fX3RleHRfXztcbiAgICAgICAgICAgIG5vZGUuX190ZXh0X18gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5leHBvcnRzLmNyZWF0ZUV4cHJGbiA9IGZ1bmN0aW9uIChleHByUmVnRXhwLCBleHByKSB7XG4gICAgZXhwciA9IGV4cHIucmVwbGFjZShleHByUmVnRXhwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBhcmd1bWVudHNbMV07XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGV4cG9ydHMuY2FsY3VsYXRlRXhwcmVzc2lvbihleHByLCBkYXRhKTtcbiAgICB9O1xufTtcblxuLyoqXG4gKiDotoXnuqfnroDljZXnmoQgZXh0ZW5kIO+8jOWboOS4uuacrOW6k+WvuSBleHRlbmQg5rKh6YKj6auY55qE6KaB5rGC77yMXG4gKiDnrYnliLDmnInopoHmsYLnmoTml7blgJnlho3lrozlloTjgIJcbiAqXG4gKiBAaW5uZXJcbiAqIEBwYXJhbSAge09iamVjdH0gdGFyZ2V0IOebruagh+WvueixoVxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAg5pyA57uI5ZCI5bm25ZCO55qE5a+56LGhXG4gKi9cbmV4cG9ydHMuZXh0ZW5kID0gZnVuY3Rpb24gKHRhcmdldCkge1xuICAgIHZhciBzcmNzID0gZXhwb3J0cy5zbGljZShhcmd1bWVudHMsIDEpO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IHNyY3MubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3Jjc1tpXSkge1xuICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzcmNzW2ldW2tleV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn07XG5cbmV4cG9ydHMudHJhdmVyc2VOb2RlcyA9IGZ1bmN0aW9uIChzdGFydE5vZGUsIGVuZE5vZGUsIG5vZGVGbiwgY29udGV4dCkge1xuICAgIHZhciBub2RlcyA9IFtdO1xuICAgIGZvciAodmFyIGN1ck5vZGUgPSBzdGFydE5vZGU7XG4gICAgICAgIGN1ck5vZGUgJiYgY3VyTm9kZSAhPT0gZW5kTm9kZTtcbiAgICAgICAgY3VyTm9kZSA9IGN1ck5vZGUubmV4dFNpYmxpbmdcbiAgICApIHtcbiAgICAgICAgbm9kZXMucHVzaChjdXJOb2RlKTtcbiAgICB9XG5cbiAgICBub2Rlcy5wdXNoKGVuZE5vZGUpO1xuXG4gICAgZXhwb3J0cy5lYWNoKG5vZGVzLCBub2RlRm4sIGNvbnRleHQpO1xufTtcblxuZXhwb3J0cy5lYWNoID0gZnVuY3Rpb24gKGFyciwgZm4sIGNvbnRleHQpIHtcbiAgICBpZiAoZXhwb3J0cy5pc0FycmF5KGFycikpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlsID0gYXJyLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChmbi5jYWxsKGNvbnRleHQsIGFycltpXSwgaSwgYXJyKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBhcnIgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGZvciAodmFyIGsgaW4gYXJyKSB7XG4gICAgICAgICAgICBpZiAoZm4uY2FsbChjb250ZXh0LCBhcnJba10sIGssIGFycikpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmV4cG9ydHMuaXNBcnJheSA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycikgPT09ICdvYmplY3QgQXJyYXknO1xufTtcblxuLyoqXG4gKiDku47ooajovr7lvI/kuK3mir3nprvlh7rlj5jph4/lkI1cbiAqXG4gKiBAaW5uZXJcbiAqIEBwYXJhbSAge3N0cmluZ30gZXhwciDooajovr7lvI/lrZfnrKbkuLLvvIznsbvkvLzkuo4gYCR7bmFtZX1gIOS4reeahCBuYW1lXG4gKiBAcmV0dXJuIHtBcnJheS48c3RyaW5nPn0gICAgICDlj5jph4/lkI3mlbDnu4RcbiAqL1xudmFyIGV4cHJOYW1lTWFwID0ge307XG52YXIgZXhwck5hbWVSZWdFeHAgPSAvXFwuP1xcJD8oW2EtenxBLVpdK3woW2EtenxBLVpdK1swLTldK1thLXp8QS1aXSopKS9nO1xuZnVuY3Rpb24gZ2V0VmFyaWFibGVOYW1lc0Zyb21FeHByKGV4cHIpIHtcbiAgICBpZiAoZXhwck5hbWVNYXBbZXhwcl0pIHtcbiAgICAgICAgcmV0dXJuIGV4cHJOYW1lTWFwW2V4cHJdO1xuICAgIH1cblxuICAgIHZhciBtYXRjaGVzID0gZXhwci5tYXRjaChleHByTmFtZVJlZ0V4cCkgfHwgW107XG4gICAgdmFyIG5hbWVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gbWF0Y2hlcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIGlmIChtYXRjaGVzW2ldICYmIG1hdGNoZXNbaV1bMF0gIT09ICcuJykge1xuICAgICAgICAgICAgbmFtZXMucHVzaChtYXRjaGVzW2ldKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGV4cHJOYW1lTWFwW2V4cHJdID0gbmFtZXM7XG5cbiAgICByZXR1cm4gbmFtZXM7XG59XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi4vLi4vc3JjL0NvbmZpZycpO1xudmFyIEZvckRpcmVjdGl2ZVBhcnNlciA9IHJlcXVpcmUoJy4uLy4uL3NyYy9Gb3JEaXJlY3RpdmVQYXJzZXInKTtcbnZhciBUcmVlID0gcmVxdWlyZSgnLi4vLi4vc3JjL1RyZWUnKTtcblxuZGVzY3JpYmUoJ0ZvckRpcmVjdGl2ZVBhcnNlcicsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY29uZmlnO1xuICAgIHZhciB0ZXN0Tm9kZTtcblxuICAgIGJlZm9yZUFsbChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRlc3ROb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Rlc3QnKTtcbiAgICAgICAgY29uZmlnID0gbmV3IENvbmZpZygpO1xuICAgIH0pO1xuXG4gICAgYWZ0ZXJFYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGVzdE5vZGUuaW5uZXJIVE1MID0gJyc7XG4gICAgfSk7XG5cbiAgICBpdCgnJHtzdHVkZW50c30gYXMgJHtzdHVkZW50fScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGVzdE5vZGUuaW5uZXJIVE1MID0gW1xuICAgICAgICAgICAgJzwhLS0gZm9yOiAke3N0dWRlbnRzfSBhcyAke3N0dWRlbnR9IC0tPicsXG4gICAgICAgICAgICAgICAgJzxwPiR7c3R1ZGVudC5uYW1lfe+8jCR7c3R1ZGVudC5hZ2V9PC9wPicsXG4gICAgICAgICAgICAnPCEtLSAvZm9yIC0tPidcbiAgICAgICAgXS5qb2luKCcnKTtcblxuICAgICAgICB2YXIgY2FjaGVOb2RlO1xuXG4gICAgICAgIHZhciBwYXJzZXIgPSBjcmVhdGVGb3JEaXJlY3RpdmVQYXJzZXIodGVzdE5vZGUpO1xuICAgICAgICBwYXJzZXIuc2V0RGF0YSh7XG4gICAgICAgICAgICBzdHVkZW50czogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ+W8oOS4iScsXG4gICAgICAgICAgICAgICAgICAgIGFnZTogMjFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ+adjuWbmycsXG4gICAgICAgICAgICAgICAgICAgIGFnZTogMjJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ+eOi+S6lCcsXG4gICAgICAgICAgICAgICAgICAgIGFnZTogMjNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0pO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuY2hpbGROb2Rlcy5sZW5ndGgpLnRvQmUoNSk7XG4gICAgICAgIGV4cGVjdCh0ZXN0Tm9kZS5jaGlsZE5vZGVzWzFdLmlubmVyVGV4dCkudG9FcXVhbCgn5byg5LiJ77yMMjEnKTtcbiAgICAgICAgZXhwZWN0KHRlc3ROb2RlLmNoaWxkTm9kZXNbMl0uaW5uZXJUZXh0KS50b0VxdWFsKCfmnY7lm5vvvIwyMicpO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuY2hpbGROb2Rlc1szXS5pbm5lclRleHQpLnRvRXF1YWwoJ+eOi+S6lO+8jDIzJyk7XG4gICAgICAgIGNhY2hlTm9kZSA9IHRlc3ROb2RlLmNoaWxkTm9kZXNbMV07XG5cbiAgICAgICAgcGFyc2VyLnNldERhdGEoe30pO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuY2hpbGROb2Rlcy5sZW5ndGgpLnRvQmUoNSk7XG4gICAgICAgIGV4cGVjdCh0ZXN0Tm9kZS5jaGlsZE5vZGVzWzFdLnN0eWxlLmRpc3BsYXkpLnRvQmUoJ25vbmUnKTtcbiAgICAgICAgZXhwZWN0KHRlc3ROb2RlLmNoaWxkTm9kZXNbMl0uc3R5bGUuZGlzcGxheSkudG9CZSgnbm9uZScpO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuY2hpbGROb2Rlc1szXS5zdHlsZS5kaXNwbGF5KS50b0JlKCdub25lJyk7XG4gICAgICAgIGV4cGVjdCh0ZXN0Tm9kZS5jaGlsZE5vZGVzWzFdKS50b0JlKGNhY2hlTm9kZSk7XG5cbiAgICAgICAgcGFyc2VyLnNldERhdGEoe1xuICAgICAgICAgICAgc3R1ZGVudHM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICflvKDkuIknLFxuICAgICAgICAgICAgICAgICAgICBhZ2U6IDIxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICfmnY7lm5snLFxuICAgICAgICAgICAgICAgICAgICBhZ2U6IDIyXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcbiAgICAgICAgZXhwZWN0KHRlc3ROb2RlLmNoaWxkTm9kZXMubGVuZ3RoKS50b0JlKDUpO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuY2hpbGROb2Rlc1sxXS5pbm5lclRleHQpLnRvRXF1YWwoJ+W8oOS4ie+8jDIxJyk7XG4gICAgICAgIGV4cGVjdCh0ZXN0Tm9kZS5jaGlsZE5vZGVzWzJdLmlubmVyVGV4dCkudG9FcXVhbCgn5p2O5Zub77yMMjInKTtcbiAgICAgICAgZXhwZWN0KHRlc3ROb2RlLmNoaWxkTm9kZXNbM10uc3R5bGUuZGlzcGxheSkudG9CZSgnbm9uZScpO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuY2hpbGROb2Rlc1sxXSkudG9CZShjYWNoZU5vZGUpO1xuICAgIH0pO1xuXG4gICAgaXQoJyR7c3R1ZGVudHN9IGFzICR7c3R1ZGVudH0sICR7aW5kZXh9LCAke2tleX0nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRlc3ROb2RlLmlubmVySFRNTCA9IFtcbiAgICAgICAgICAgICc8IS0tIGZvcjogJHtzdHVkZW50c30gYXMgJHtzdHVkZW50fSAtLT4nLFxuICAgICAgICAgICAgICAgICc8cD4ke3N0dWRlbnQubmFtZX3vvIwke3N0dWRlbnQuYWdlfe+8jCR7aW5kZXh977yMJHtrZXl9PC9wPicsXG4gICAgICAgICAgICAnPCEtLSAvZm9yIC0tPidcbiAgICAgICAgXS5qb2luKCcnKTtcblxuICAgICAgICB2YXIgcGFyc2VyID0gY3JlYXRlRm9yRGlyZWN0aXZlUGFyc2VyKHRlc3ROb2RlKTtcbiAgICAgICAgcGFyc2VyLnNldERhdGEoe1xuICAgICAgICAgICAgc3R1ZGVudHM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICflvKDkuIknLFxuICAgICAgICAgICAgICAgICAgICBhZ2U6IDIxXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcbiAgICAgICAgZXhwZWN0KHRlc3ROb2RlLmNoaWxkTm9kZXMubGVuZ3RoKS50b0JlKDMpO1xuICAgICAgICBleHBlY3QodGVzdE5vZGUuY2hpbGROb2Rlc1sxXS5pbm5lclRleHQpLnRvRXF1YWwoJ+W8oOS4ie+8jDIx77yMMO+8jDAnKTtcblxuICAgICAgICBwYXJzZXIuc2V0RGF0YSh7XG4gICAgICAgICAgICBzdHVkZW50czoge1xuICAgICAgICAgICAgICAgICflvKDkuIknOiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICflvKDkuIknLFxuICAgICAgICAgICAgICAgICAgICBhZ2U6IDIxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAn5p2O5ZubJzoge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAn5p2O5ZubJyxcbiAgICAgICAgICAgICAgICAgICAgYWdlOiAyMlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGV4cGVjdCh0ZXN0Tm9kZS5jaGlsZE5vZGVzLmxlbmd0aCkudG9CZSg0KTtcbiAgICAgICAgZXhwZWN0KHRlc3ROb2RlLmNoaWxkTm9kZXNbMV0uaW5uZXJUZXh0KS50b0VxdWFsKCflvKDkuInvvIwyMe+8jDDvvIzlvKDkuIknKTtcbiAgICAgICAgZXhwZWN0KHRlc3ROb2RlLmNoaWxkTm9kZXNbMl0uaW5uZXJUZXh0KS50b0VxdWFsKCfmnY7lm5vvvIwyMu+8jDHvvIzmnY7lm5snKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUZvckRpcmVjdGl2ZVBhcnNlcihub2RlKSB7XG4gICAgICAgIHZhciBwYXJzZXIgPSBuZXcgRm9yRGlyZWN0aXZlUGFyc2VyKHtcbiAgICAgICAgICAgIHN0YXJ0Tm9kZTogbm9kZS5maXJzdENoaWxkLFxuICAgICAgICAgICAgZW5kTm9kZTogbm9kZS5sYXN0Q2hpbGQsXG4gICAgICAgICAgICBjb25maWc6IGNvbmZpZyxcbiAgICAgICAgICAgIFRyZWU6IFRyZWVcbiAgICAgICAgfSk7XG4gICAgICAgIHBhcnNlci5jb2xsZWN0RXhwcnMoKTtcbiAgICAgICAgcmV0dXJuIHBhcnNlcjtcbiAgICB9XG59KTsiXX0=
