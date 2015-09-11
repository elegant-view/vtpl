(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./src/Tree');
},{"./src/Tree":6}],2:[function(require,module,exports){
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

},{"./Parser":5,"./inherit":8,"./utils":9}],3:[function(require,module,exports){
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

},{"./Parser":5,"./inherit":8,"./utils":9}],4:[function(require,module,exports){
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

},{"./Parser":5,"./inherit":8,"./utils":9}],5:[function(require,module,exports){
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




},{"./ExprParser":2,"./ForDirectiveParser":3,"./IfDirectiveParser":4,"./utils":9}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
var Tree = require('../../index');
var Config = require('../../src/config');

var tree = new Tree({
    startNode: document.getElementById('rootNode'),
    endNode: document.getElementById('rootNode'),
    config: new Config()
});

tree.traverse();
console.log(tree);

tree.setData({
    list: [
        {
            name: 'zhangsan'
        }
    ]
});

tree.setData({
    list: [
        {
            name: 'lisi'
        },
        {
            name: 'zhangsan'
        }
    ]
});

window.tree = tree;
},{"../../index":1,"../../src/config":7}]},{},[10])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL2luZGV4LmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL0V4cHJQYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvRm9yRGlyZWN0aXZlUGFyc2VyLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL0lmRGlyZWN0aXZlUGFyc2VyLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL1BhcnNlci5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9UcmVlLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL2NvbmZpZy5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9pbmhlcml0LmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL3V0aWxzLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvdGVzdC9zcmMvZmFrZV80YTI4MDJiZi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zcmMvVHJlZScpOyIsIi8qKlxuICogQGZpbGUg6KGo6L6+5byP6Kej5p6Q5Zmo77yM5LiA5Liq5paH5pys6IqC54K55oiW6ICF5YWD57Sg6IqC54K55a+55bqU5LiA5Liq6KGo6L6+5byP6Kej5p6Q5Zmo5a6e5L6LXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxudmFyIFBhcnNlciA9IHJlcXVpcmUoJy4vUGFyc2VyJyk7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJy4vaW5oZXJpdCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBFeHByUGFyc2VyKG9wdGlvbnMpIHtcbiAgICBQYXJzZXIuY2FsbCh0aGlzLCBvcHRpb25zKTtcbn1cblxuRXhwclBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdGhpcy5ub2RlID0gb3B0aW9ucy5ub2RlO1xuICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG5cbiAgICB0aGlzLmV4cHJzID0gW107XG4gICAgdGhpcy5leHByRm5zID0ge307XG4gICAgdGhpcy51cGRhdGVGbnMgPSB7fTtcbiAgICB0aGlzLmV4cHJPbGRWYWx1ZXMgPSB7fTtcbn07XG5cbkV4cHJQYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyTm9kZSA9IHRoaXMubm9kZTtcblxuICAgIC8vIOaWh+acrOiKgueCuVxuICAgIGlmIChjdXJOb2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIGFkZEV4cHIodGhpcywgY3VyTm9kZS5ub2RlVmFsdWUsIChmdW5jdGlvbiAoY3VyTm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChleHByVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBjdXJOb2RlLm5vZGVWYWx1ZSA9IGV4cHJWYWx1ZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pKGN1ck5vZGUpKTtcbiAgICB9XG4gICAgLy8g5YWD57Sg6IqC54K5XG4gICAgZWxzZSBpZiAoY3VyTm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICB2YXIgYXR0cmlidXRlcyA9IGN1ck5vZGUuYXR0cmlidXRlcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlsID0gYXR0cmlidXRlcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYXR0ciA9IGF0dHJpYnV0ZXNbaV07XG4gICAgICAgICAgICBhZGRFeHByKHRoaXMsIGF0dHIudmFsdWUsIGNyZWF0ZUF0dHJVcGRhdGVGbihhdHRyKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVBdHRyVXBkYXRlRm4oYXR0cikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGV4cHJWYWx1ZSkge1xuICAgICAgICAgICAgYXR0ci52YWx1ZSA9IGV4cHJWYWx1ZTtcbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG5FeHByUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgZXhwcnMgPSB0aGlzLmV4cHJzO1xuICAgIHZhciBleHByT2xkVmFsdWVzID0gdGhpcy5leHByT2xkVmFsdWVzO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGV4cHJzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgdmFyIGV4cHIgPSBleHByc1tpXTtcbiAgICAgICAgdmFyIGV4cHJWYWx1ZSA9IHRoaXMuZXhwckZuc1tleHByXShkYXRhKTtcblxuICAgICAgICBpZiAodGhpcy5kaXJ0eUNoZWNrKGV4cHIsIGV4cHJWYWx1ZSwgZXhwck9sZFZhbHVlc1tleHByXSkpIHtcbiAgICAgICAgICAgIHZhciB1cGRhdGVGbnMgPSB0aGlzLnVwZGF0ZUZuc1tleHByXTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwLCBqbCA9IHVwZGF0ZUZucy5sZW5ndGg7IGogPCBqbDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlRm5zW2pdKGV4cHJWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHByT2xkVmFsdWVzW2V4cHJdID0gZXhwclZhbHVlO1xuICAgIH1cbn07XG5cbkV4cHJQYXJzZXIucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy5nb0RhcmsodGhpcy5ub2RlKTtcbn07XG5cbkV4cHJQYXJzZXIucHJvdG90eXBlLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy5yZXN0b3JlRnJvbURhcmsodGhpcy5ub2RlKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0KEV4cHJQYXJzZXIsIFBhcnNlcik7XG5cbmZ1bmN0aW9uIGFkZEV4cHIocGFyc2VyLCBleHByLCB1cGRhdGVGbikge1xuICAgIHBhcnNlci5leHBycy5wdXNoKGV4cHIpO1xuICAgIGlmICghcGFyc2VyLmV4cHJGbnNbZXhwcl0pIHtcbiAgICAgICAgcGFyc2VyLmV4cHJGbnNbZXhwcl0gPSBjcmVhdGVFeHByRm4ocGFyc2VyLmNvbmZpZy5nZXRFeHByUmVnRXhwKCksIGV4cHIpO1xuICAgIH1cbiAgICBwYXJzZXIudXBkYXRlRm5zW2V4cHJdID0gcGFyc2VyLnVwZGF0ZUZuc1tleHByXSB8fCBbXTtcbiAgICBwYXJzZXIudXBkYXRlRm5zW2V4cHJdLnB1c2godXBkYXRlRm4pO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFeHByRm4oZXhwclJlZ0V4cCwgZXhwcikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICByZXR1cm4gZXhwci5yZXBsYWNlKGV4cHJSZWdFeHAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB1dGlscy5jYWxjdWxhdGVFeHByZXNzaW9uKGFyZ3VtZW50c1sxXSwgZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG4iLCIvKipcbiAqIEBmaWxlIGZvciDmjIfku6RcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJy4vaW5oZXJpdCcpO1xudmFyIFBhcnNlciA9IHJlcXVpcmUoJy4vUGFyc2VyJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIEZvckRpcmVjdGl2ZVBhcnNlcihvcHRpb25zKSB7XG4gICAgUGFyc2VyLmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG5cbkZvckRpcmVjdGl2ZVBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdGhpcy5zdGFydE5vZGUgPSBvcHRpb25zLnN0YXJ0Tm9kZTtcbiAgICB0aGlzLmVuZE5vZGUgPSBvcHRpb25zLmVuZE5vZGU7XG4gICAgdGhpcy5jb25maWcgPSBvcHRpb25zLmNvbmZpZztcbiAgICB0aGlzLlRyZWUgPSBvcHRpb25zLlRyZWU7XG59O1xuXG5Gb3JEaXJlY3RpdmVQYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5zdGFydE5vZGUubmV4dFNpYmxpbmcgPT09IHRoaXMuZW5kTm9kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHRwbFNlZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHV0aWxzLnRyYXZlcnNlTm9kZXModGhpcy5zdGFydE5vZGUsIHRoaXMuZW5kTm9kZSwgZnVuY3Rpb24gKGN1ck5vZGUpIHtcbiAgICAgICAgaWYgKGN1ck5vZGUgPT09IHRoaXMuc3RhcnROb2RlIHx8IGN1ck5vZGUgPT09IHRoaXMuZW5kTm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdHBsU2VnLmFwcGVuZENoaWxkKGN1ck5vZGUpO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMudHBsU2VnID0gdHBsU2VnO1xuXG4gICAgdGhpcy5leHByID0gdGhpcy5zdGFydE5vZGUubm9kZVZhbHVlLm1hdGNoKHRoaXMuY29uZmlnLmdldEZvckV4cHJzUmVnRXhwKCkpWzFdO1xuICAgIHRoaXMuZXhwckZuID0gdXRpbHMuY3JlYXRlRXhwckZuKHRoaXMuY29uZmlnLmdldEV4cHJSZWdFeHAoKSwgdGhpcy5leHByKTtcbiAgICB0aGlzLnVwZGF0ZUZuID0gY3JlYXRlVXBkYXRlRm4oXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHRoaXMuVHJlZSxcbiAgICAgICAgdGhpcy5zdGFydE5vZGUubmV4dFNpYmxpbmcsXG4gICAgICAgIHRoaXMuZW5kTm9kZS5wcmV2aW91c1NpYmxpbmcsXG4gICAgICAgIHRoaXMuY29uZmlnLFxuICAgICAgICB0aGlzLnN0YXJ0Tm9kZS5ub2RlVmFsdWVcbiAgICApO1xufTtcblxuRm9yRGlyZWN0aXZlUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoIXRoaXMuZXhwcikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGV4cHJWYWx1ZSA9IHRoaXMuZXhwckZuKGRhdGEpO1xuICAgIGlmICh0aGlzLmRpcnR5Q2hlY2sodGhpcy5leHByLCBleHByVmFsdWUsIHRoaXMuZXhwck9sZFZhbHVlKSkge1xuICAgICAgICB0aGlzLnVwZGF0ZUZuKGV4cHJWYWx1ZSwgZGF0YSk7XG4gICAgfVxuXG4gICAgdGhpcy5leHByT2xkVmFsdWUgPSBleHByVmFsdWU7XG59O1xuXG5Gb3JEaXJlY3RpdmVQYXJzZXIuaXNGb3JOb2RlID0gZnVuY3Rpb24gKG5vZGUsIGNvbmZpZykge1xuICAgIHJldHVybiBub2RlLm5vZGVUeXBlID09PSA4ICYmIGNvbmZpZy5mb3JQcmVmaXhSZWdFeHAudGVzdChub2RlLm5vZGVWYWx1ZSk7XG59O1xuXG5Gb3JEaXJlY3RpdmVQYXJzZXIuaXNGb3JFbmROb2RlID0gZnVuY3Rpb24gKG5vZGUsIGNvbmZpZykge1xuICAgIHJldHVybiBub2RlLm5vZGVUeXBlID09PSA4ICYmIGNvbmZpZy5mb3JFbmRQcmVmaXhSZWdFeHAudGVzdChub2RlLm5vZGVWYWx1ZSk7XG59O1xuXG5Gb3JEaXJlY3RpdmVQYXJzZXIuZmluZEZvckVuZCA9IGZ1bmN0aW9uIChmb3JTdGFydE5vZGUsIGNvbmZpZykge1xuICAgIHZhciBjdXJOb2RlID0gZm9yU3RhcnROb2RlO1xuICAgIHdoaWxlICgoY3VyTm9kZSA9IGN1ck5vZGUubmV4dFNpYmxpbmcpKSB7XG4gICAgICAgIGlmIChGb3JEaXJlY3RpdmVQYXJzZXIuaXNGb3JFbmROb2RlKGN1ck5vZGUsIGNvbmZpZykpIHtcbiAgICAgICAgICAgIHJldHVybiBjdXJOb2RlO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0KEZvckRpcmVjdGl2ZVBhcnNlciwgUGFyc2VyKTtcblxuZnVuY3Rpb24gY3JlYXRlVXBkYXRlRm4ocGFyc2VyLCBUcmVlLCBzdGFydE5vZGUsIGVuZE5vZGUsIGNvbmZpZywgZnVsbEV4cHIpIHtcbiAgICB2YXIgdHJlZXMgPSBbXTtcbiAgICB2YXIgaXRlbVZhcmlhYmxlTmFtZSA9IGZ1bGxFeHByLm1hdGNoKHBhcnNlci5jb25maWcuZ2V0Rm9ySXRlbVZhbHVlTmFtZVJlZ0V4cCgpKVsxXTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGV4cHJWYWx1ZSwgZGF0YSkge1xuICAgICAgICB2YXIgaW5kZXggPSAwO1xuICAgICAgICBmb3IgKHZhciBrIGluIGV4cHJWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKCF0cmVlc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgICB0cmVlc1tpbmRleF0gPSBjcmVhdGVUcmVlKHBhcnNlciwgVHJlZSwgY29uZmlnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdHJlZXNbaW5kZXhdLnJlc3RvcmVGcm9tRGFyaygpO1xuICAgICAgICAgICAgdHJlZXNbaW5kZXhdLnNldERpcnR5Q2hlY2tlcihwYXJzZXIuZGlydHlDaGVja2VyKTtcblxuICAgICAgICAgICAgdmFyIGxvY2FsID0ge1xuICAgICAgICAgICAgICAgIGtleTogayxcbiAgICAgICAgICAgICAgICBpbmRleDogaW5kZXhcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBsb2NhbFtpdGVtVmFyaWFibGVOYW1lXSA9IGV4cHJWYWx1ZVtrXTtcbiAgICAgICAgICAgIHRyZWVzW2luZGV4XS5zZXREYXRhKHV0aWxzLmV4dGVuZCh7fSwgZGF0YSwgbG9jYWwpKTtcblxuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSBpbmRleCwgaWwgPSB0cmVlcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgICAgICB0cmVlc1tpXS5nb0RhcmsoKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRyZWUocGFyc2VyLCBUcmVlLCBjb25maWcpIHtcbiAgICB2YXIgY29weVNlZyA9IHBhcnNlci50cGxTZWcuY2xvbmVOb2RlKHRydWUpO1xuICAgIHZhciBzdGFydE5vZGUgPSBjb3B5U2VnLmZpcnN0Q2hpbGQ7XG4gICAgdmFyIGVuZE5vZGUgPSBjb3B5U2VnLmxhc3RDaGlsZDtcbiAgICB1dGlscy50cmF2ZXJzZU5vZGVzKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgZnVuY3Rpb24gKGN1ck5vZGUpIHtcbiAgICAgICAgcGFyc2VyLmVuZE5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoY3VyTm9kZSwgcGFyc2VyLmVuZE5vZGUpO1xuICAgIH0pO1xuXG4gICAgdmFyIHRyZWUgPSBuZXcgVHJlZSh7XG4gICAgICAgIHN0YXJ0Tm9kZTogc3RhcnROb2RlLFxuICAgICAgICBlbmROb2RlOiBlbmROb2RlLFxuICAgICAgICBjb25maWc6IGNvbmZpZ1xuICAgIH0pO1xuICAgIHRyZWUudHJhdmVyc2UoKTtcbiAgICByZXR1cm4gdHJlZTtcbn1cbiIsIi8qKlxuICogQGZpbGUgaWYg5oyH5LukXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxudmFyIFBhcnNlciA9IHJlcXVpcmUoJy4vUGFyc2VyJyk7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJy4vaW5oZXJpdCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBJZkRpcmVjdGl2ZVBhcnNlcihvcHRpb25zKSB7XG4gICAgUGFyc2VyLmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG5cbklmRGlyZWN0aXZlUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB0aGlzLnN0YXJ0Tm9kZSA9IG9wdGlvbnMuc3RhcnROb2RlO1xuICAgIHRoaXMuZW5kTm9kZSA9IG9wdGlvbnMuZW5kTm9kZTtcbiAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xuXG4gICAgdGhpcy5leHBycyA9IFtdO1xuICAgIHRoaXMuZXhwckZucyA9IHt9O1xufTtcblxuSWZEaXJlY3RpdmVQYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyTm9kZSA9IHRoaXMuc3RhcnROb2RlO1xuICAgIHZhciBicmFuY2hlcyA9IFtdO1xuICAgIHZhciBicmFuY2hJbmRleCA9IC0xO1xuICAgIGRvIHtcbiAgICAgICAgdmFyIG5vZGVUeXBlID0gZ2V0SWZOb2RlVHlwZShjdXJOb2RlLCB0aGlzLmNvbmZpZyk7XG5cbiAgICAgICAgaWYgKG5vZGVUeXBlKSB7XG4gICAgICAgICAgICBzZXRFbmROb2RlKGN1ck5vZGUsIGJyYW5jaGVzLCBicmFuY2hJbmRleCk7XG5cbiAgICAgICAgICAgIGJyYW5jaEluZGV4Kys7XG4gICAgICAgICAgICBicmFuY2hlc1ticmFuY2hJbmRleF0gPSBicmFuY2hlc1ticmFuY2hJbmRleF0gfHwge307XG5cbiAgICAgICAgICAgIC8vIOaYryBpZiDoioLngrnmiJbogIUgZWxpZiDoioLngrnvvIzmkJzpm4booajovr7lvI9cbiAgICAgICAgICAgIGlmIChub2RlVHlwZSA8IDMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhwciA9IGN1ck5vZGUubm9kZVZhbHVlLnJlcGxhY2UodGhpcy5jb25maWcuZ2V0QWxsSWZSZWdFeHAoKSwgJycpO1xuICAgICAgICAgICAgICAgIHRoaXMuZXhwcnMucHVzaChleHByKTtcblxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5leHByRm5zW2V4cHJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXhwckZuc1tleHByXSA9IHV0aWxzLmNyZWF0ZUV4cHJGbih0aGlzLmNvbmZpZy5nZXRFeHByUmVnRXhwKCksIGV4cHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmICghYnJhbmNoZXNbYnJhbmNoSW5kZXhdLnN0YXJ0Tm9kZSkge1xuICAgICAgICAgICAgICAgIGJyYW5jaGVzW2JyYW5jaEluZGV4XS5zdGFydE5vZGUgPSBjdXJOb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY3VyTm9kZSA9IGN1ck5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgIGlmICghY3VyTm9kZSB8fCBjdXJOb2RlID09PSB0aGlzLmVuZE5vZGUpIHtcbiAgICAgICAgICAgIHNldEVuZE5vZGUoY3VyTm9kZSwgYnJhbmNoZXMsIGJyYW5jaEluZGV4KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSB3aGlsZSAodHJ1ZSk7XG5cbiAgICByZXR1cm4gYnJhbmNoZXM7XG5cbiAgICBmdW5jdGlvbiBzZXRFbmROb2RlKGN1ck5vZGUsIGJyYW5jaGVzLCBicmFuY2hJbmRleCkge1xuICAgICAgICBpZiAoYnJhbmNoSW5kZXggKyAxICYmIGJyYW5jaGVzW2JyYW5jaEluZGV4XS5zdGFydE5vZGUpIHtcbiAgICAgICAgICAgIGJyYW5jaGVzW2JyYW5jaEluZGV4XS5lbmROb2RlID0gY3VyTm9kZS5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5JZkRpcmVjdGl2ZVBhcnNlci5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGV4cHJzID0gdGhpcy5leHBycztcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBleHBycy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIHZhciBleHByID0gZXhwcnNbaV07XG4gICAgICAgIHZhciBleHByVmFsdWUgPSB0aGlzLmV4cHJGbnNbZXhwcl0oZGF0YSk7XG4gICAgICAgIGlmIChleHByVmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuSWZEaXJlY3RpdmVQYXJzZXIuaXNJZk5vZGUgPSBmdW5jdGlvbiAobm9kZSwgY29uZmlnKSB7XG4gICAgcmV0dXJuIGdldElmTm9kZVR5cGUobm9kZSwgY29uZmlnKSA9PT0gMTtcbn07XG5cbklmRGlyZWN0aXZlUGFyc2VyLmlzRWxpZk5vZGUgPSBmdW5jdGlvbiAobm9kZSwgY29uZmlnKSB7XG4gICAgcmV0dXJuIGdldElmTm9kZVR5cGUobm9kZSwgY29uZmlnKSA9PT0gMjtcbn07XG5cbklmRGlyZWN0aXZlUGFyc2VyLmlzRWxzZU5vZGUgPSBmdW5jdGlvbiAobm9kZSwgY29uZmlnKSB7XG4gICAgcmV0dXJuIGdldElmTm9kZVR5cGUobm9kZSwgY29uZmlnKSA9PT0gMztcbn07XG5cbklmRGlyZWN0aXZlUGFyc2VyLmlzSWZFbmROb2RlID0gZnVuY3Rpb24gKG5vZGUsIGNvbmZpZykge1xuICAgIHJldHVybiBnZXRJZk5vZGVUeXBlKG5vZGUsIGNvbmZpZykgPT09IDQ7XG59O1xuXG5JZkRpcmVjdGl2ZVBhcnNlci5maW5kSWZFbmQgPSBmdW5jdGlvbiAoaWZTdGFydE5vZGUsIGNvbmZpZykge1xuICAgIHZhciBjdXJOb2RlID0gaWZTdGFydE5vZGU7XG4gICAgd2hpbGUgKChjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZykpIHtcbiAgICAgICAgaWYgKElmRGlyZWN0aXZlUGFyc2VyLmlzSWZFbmROb2RlKGN1ck5vZGUsIGNvbmZpZykpIHtcbiAgICAgICAgICAgIHJldHVybiBjdXJOb2RlO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0KElmRGlyZWN0aXZlUGFyc2VyLCBQYXJzZXIpO1xuXG5mdW5jdGlvbiBnZXRJZk5vZGVUeXBlKG5vZGUsIGNvbmZpZykge1xuICAgIGlmIChub2RlLm5vZGVUeXBlICE9PSA4KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLmlmUHJlZml4UmVnRXhwLnRlc3Qobm9kZS5ub2RlVmFsdWUpKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGlmIChjb25maWcuZWxpZlByZWZpeFJlZ0V4cC50ZXN0KG5vZGUubm9kZVZhbHVlKSkge1xuICAgICAgICByZXR1cm4gMjtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLmVsc2VQcmVmaXhSZWdFeHAudGVzdChub2RlLm5vZGVWYWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIDM7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5pZkVuZFByZWZpeFJlZ0V4cC50ZXN0KG5vZGUubm9kZVZhbHVlKSkge1xuICAgICAgICByZXR1cm4gNDtcbiAgICB9XG59XG4iLCIvKipcbiAqIEBmaWxlIOino+aekOWZqOeahOaKveixoeWfuuexu1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbi8qKlxuICog5p6E6YCg5Ye95pWwXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDphY3nva7lj4LmlbDvvIzkuIDoiKzlj6/og73kvJrmnInlpoLkuIvlhoXlrrnvvJpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydE5vZGU6IC4uLixcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmROb2RlOiAuLi4sXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogLi4uLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZzogLi4uXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICDlhbfkvZPmmK/llaXlj6/ku6Xlj4LliqDlhbfkvZPnmoTlrZDnsbtcbiAqL1xuZnVuY3Rpb24gUGFyc2VyKG9wdGlvbnMpIHtcbiAgICB0aGlzLmluaXRpYWxpemUob3B0aW9ucyk7XG59XG5cbi8qKlxuICog5Yid5aeL5YyWXG4gKlxuICogQHByb3RlY3RlZFxuICogQGFic3RyYWN0XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyDmnaXoh6rkuo7mnoTpgKDlh73mlbBcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHt9O1xuXG4vKipcbiAqIOmUgOavgeino+aekOWZqFxuICpcbiAqIEBwdWJsaWNcbiAqIEBhYnN0cmFjdFxuICovXG5QYXJzZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDorr7nva7mlbDmja5cbiAqXG4gKiBAcHVibGljXG4gKiBAYWJzdHJhY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIOimgeiuvue9rueahOaVsOaNrlxuICovXG5QYXJzZXIucHJvdG90eXBlLnNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge307XG5cbi8qKlxuICog6ZqQ6JeP55u45YWz5YWD57SgXG4gKlxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vKipcbiAqIOaYvuekuuebuOWFs+WFg+e0oFxuICpcbiAqIEBwdWJsaWNcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDmkJzpm4booajovr7lvI/vvIznlJ/miJDooajovr7lvI/lh73mlbDlkowgRE9NIOabtOaWsOWHveaVsFxuICpcbiAqIEBhYnN0cmFjdFxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHt9O1xuXG5QYXJzZXIucHJvdG90eXBlLmRpcnR5Q2hlY2sgPSBmdW5jdGlvbiAoZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWUpIHtcbiAgICB2YXIgZGlydHlDaGVja2VyRm4gPSB0aGlzLmRpcnR5Q2hlY2tlciA/IHRoaXMuZGlydHlDaGVja2VyLmdldENoZWNrZXIoZXhwcikgOiBudWxsO1xuICAgIHJldHVybiAoZGlydHlDaGVja2VyRm4gJiYgZGlydHlDaGVja2VyRm4oZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWUpKVxuICAgICAgICAgICAgfHwgKCFkaXJ0eUNoZWNrZXJGbiAmJiBleHByVmFsdWUgIT09IGV4cHJPbGRWYWx1ZSk7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLnNldERpcnR5Q2hlY2tlciA9IGZ1bmN0aW9uIChkaXJ0eUNoZWNrZXIpIHtcbiAgICB0aGlzLmRpcnR5Q2hlY2tlciA9IGRpcnR5Q2hlY2tlcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGFyc2VyO1xuIiwiLyoqXG4gKiBAZmlsZSDmnIDnu4jnmoTmoJFcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG52YXIgSWZEaXJlY3RpdmVQYXJzZXIgPSByZXF1aXJlKCcuL0lmRGlyZWN0aXZlUGFyc2VyJyk7XG52YXIgRXhwclBhcnNlciA9IHJlcXVpcmUoJy4vRXhwclBhcnNlcicpO1xudmFyIEZvckRpcmVjdGl2ZVBhcnNlciA9IHJlcXVpcmUoJy4vRm9yRGlyZWN0aXZlUGFyc2VyJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIFRyZWUob3B0aW9ucykge1xuICAgIHRoaXMuc3RhcnROb2RlID0gb3B0aW9ucy5zdGFydE5vZGU7XG4gICAgdGhpcy5lbmROb2RlID0gb3B0aW9ucy5lbmROb2RlO1xuICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG5cbiAgICB0aGlzLnRyZWUgPSBbXTtcbn1cblxuVHJlZS5wcm90b3R5cGUudHJhdmVyc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgd2Fsayh0aGlzLCB0aGlzLnN0YXJ0Tm9kZSwgdGhpcy5lbmROb2RlLCB0aGlzLnRyZWUpO1xufTtcblxuVHJlZS5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgZGF0YSA9IGRhdGEgfHwge307XG4gICAgd2Fsa1BhcnNlcnModGhpcywgdGhpcy50cmVlLCBkYXRhKTtcbn07XG5cblRyZWUucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyTm9kZSA9IHRoaXMuc3RhcnROb2RlO1xuICAgIGRvIHtcbiAgICAgICAgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDEgfHwgY3VyTm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICAgICAgdXRpbHMuZ29EYXJrKGN1ck5vZGUpO1xuICAgICAgICB9XG4gICAgfSB3aGlsZSAoKGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nKSAmJiBjdXJOb2RlICE9PSB0aGlzLmVuZE5vZGUpO1xufTtcblxuVHJlZS5wcm90b3R5cGUucmVzdG9yZUZyb21EYXJrID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJOb2RlID0gdGhpcy5zdGFydE5vZGU7XG4gICAgZG8ge1xuICAgICAgICBpZiAoY3VyTm9kZS5ub2RlVHlwZSA9PT0gMSB8fCBjdXJOb2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgICAgICB1dGlscy5yZXN0b3JlRnJvbURhcmsoY3VyTm9kZSk7XG4gICAgICAgIH1cbiAgICB9IHdoaWxlICgoY3VyTm9kZSA9IGN1ck5vZGUubmV4dFNpYmxpbmcpICYmIGN1ck5vZGUgIT09IHRoaXMuZW5kTm9kZSk7XG59O1xuXG5UcmVlLnByb3RvdHlwZS5zZXREaXJ0eUNoZWNrZXIgPSBmdW5jdGlvbiAoZGlydHlDaGVja2VyKSB7XG4gICAgdGhpcy5kaXJ0eUNoZWNrZXIgPSBkaXJ0eUNoZWNrZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyZWU7XG5cbmZ1bmN0aW9uIHdhbGtQYXJzZXJzKHRyZWUsIHBhcnNlcnMsIGRhdGEpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBwYXJzZXJzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcnNlck9iaiA9IHBhcnNlcnNbaV07XG4gICAgICAgIHBhcnNlck9iai5wYXJzZXIuc2V0RGlydHlDaGVja2VyKHRyZWUuZGlydHlDaGVja2VyKTtcbiAgICAgICAgcGFyc2VyT2JqLmRhdGEgPSB1dGlscy5leHRlbmQoe30sIHBhcnNlck9iai5kYXRhIHx8IHt9LCBkYXRhKTtcblxuICAgICAgICBpZiAocGFyc2VyT2JqLnBhcnNlciBpbnN0YW5jZW9mIElmRGlyZWN0aXZlUGFyc2VyKSB7XG4gICAgICAgICAgICB2YXIgYnJhbmNoSW5kZXggPSBwYXJzZXJPYmoucGFyc2VyLnNldERhdGEocGFyc2VyT2JqLmRhdGEpO1xuICAgICAgICAgICAgdmFyIGJyYW5jaGVzID0gcGFyc2VyT2JqLmNoaWxkcmVuO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDAsIGpsID0gYnJhbmNoZXMubGVuZ3RoOyBqIDwgamw7IGorKykge1xuICAgICAgICAgICAgICAgIGlmIChqID09PSBicmFuY2hJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICB3YWxrUGFyc2Vycyh0cmVlLCBicmFuY2hlc1tqXSwgcGFyc2VyT2JqLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciB6ID0gMCwgemwgPSBicmFuY2hlc1tqXS5sZW5ndGg7IHogPCB6bDsgeisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChicmFuY2hlc1tqXVt6XS5wYXJzZXIgaW5zdGFuY2VvZiBFeHByUGFyc2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmFuY2hlc1tqXVt6XS5wYXJzZXIuZ29EYXJrKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAocGFyc2VyT2JqLnBhcnNlciBpbnN0YW5jZW9mIEV4cHJQYXJzZXIpIHtcbiAgICAgICAgICAgICAgICBwYXJzZXJPYmoucGFyc2VyLnJlc3RvcmVGcm9tRGFyaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGFyc2VyT2JqLnBhcnNlci5zZXREYXRhKHBhcnNlck9iai5kYXRhKTtcbiAgICAgICAgICAgIGlmIChwYXJzZXJPYmouY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICB3YWxrUGFyc2Vycyh0cmVlLCBwYXJzZXJPYmouY2hpbGRyZW4sIHBhcnNlck9iai5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gd2Fsayh0cmVlLCBzdGFydE5vZGUsIGVuZE5vZGUsIGNvbnRhaW5lcikge1xuICAgIHZhciBjdXJOb2RlID0gc3RhcnROb2RlO1xuICAgIGRvIHtcbiAgICAgICAgaWYgKCFjdXJOb2RlKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChJZkRpcmVjdGl2ZVBhcnNlci5pc0lmTm9kZShjdXJOb2RlLCB0cmVlLmNvbmZpZykpIHtcbiAgICAgICAgICAgIHZhciBpZkVuZE5vZGUgPSBJZkRpcmVjdGl2ZVBhcnNlci5maW5kSWZFbmQoY3VyTm9kZSwgdHJlZS5jb25maWcpO1xuICAgICAgICAgICAgaWYgKCFpZkVuZE5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RoZSBpZiBkaXJlY3RpdmUgaXMgbm90IHByb3Blcmx5IGVuZGVkIScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaWZEaXJlY3RpdmVQYXJzZXIgPSBuZXcgSWZEaXJlY3RpdmVQYXJzZXIoe1xuICAgICAgICAgICAgICAgIHN0YXJ0Tm9kZTogY3VyTm9kZSxcbiAgICAgICAgICAgICAgICBlbmROb2RlOiBpZkVuZE5vZGUsXG4gICAgICAgICAgICAgICAgY29uZmlnOiB0cmVlLmNvbmZpZ1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBicmFuY2hlcyA9IGlmRGlyZWN0aXZlUGFyc2VyLmNvbGxlY3RFeHBycygpO1xuICAgICAgICAgICAgY29udGFpbmVyLnB1c2goe3BhcnNlcjogaWZEaXJlY3RpdmVQYXJzZXIsIGNoaWxkcmVuOiBicmFuY2hlc30pO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlsID0gYnJhbmNoZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICghYnJhbmNoZXNbaV0uc3RhcnROb2RlIHx8ICFicmFuY2hlc1tpXS5lbmROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBpZkNvbiA9IFtdO1xuICAgICAgICAgICAgICAgIHdhbGsodHJlZSwgYnJhbmNoZXNbaV0uc3RhcnROb2RlLCBicmFuY2hlc1tpXS5lbmROb2RlLCBpZkNvbik7XG4gICAgICAgICAgICAgICAgYnJhbmNoZXNbaV0gPSBpZkNvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY3VyTm9kZSA9IGlmRW5kTm9kZS5uZXh0U2libGluZztcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKEZvckRpcmVjdGl2ZVBhcnNlci5pc0Zvck5vZGUoY3VyTm9kZSwgdHJlZS5jb25maWcpKSB7XG4gICAgICAgICAgICB2YXIgZm9yRW5kTm9kZSA9IEZvckRpcmVjdGl2ZVBhcnNlci5maW5kRm9yRW5kKGN1ck5vZGUsIHRyZWUuY29uZmlnKTtcbiAgICAgICAgICAgIGlmICghZm9yRW5kTm9kZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndGhlIGZvciBkaXJlY3RpdmUgaXMgbm90IHByb3Blcmx5IGVuZGVkIScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZm9yRGlyZWN0aXZlUGFyc2VyID0gbmV3IEZvckRpcmVjdGl2ZVBhcnNlcih7XG4gICAgICAgICAgICAgICAgc3RhcnROb2RlOiBjdXJOb2RlLFxuICAgICAgICAgICAgICAgIGVuZE5vZGU6IGZvckVuZE5vZGUsXG4gICAgICAgICAgICAgICAgY29uZmlnOiB0cmVlLmNvbmZpZyxcbiAgICAgICAgICAgICAgICBUcmVlOiBUcmVlXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZm9yRGlyZWN0aXZlUGFyc2VyLmNvbGxlY3RFeHBycygpO1xuICAgICAgICAgICAgY29udGFpbmVyLnB1c2goe3BhcnNlcjogZm9yRGlyZWN0aXZlUGFyc2VyfSk7XG5cbiAgICAgICAgICAgIGN1ck5vZGUgPSBmb3JFbmROb2RlLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZXhwclBhcnNlciA9IG5ldyBFeHByUGFyc2VyKHtcbiAgICAgICAgICAgICAgICBub2RlOiBjdXJOb2RlLFxuICAgICAgICAgICAgICAgIGNvbmZpZzogdHJlZS5jb25maWdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZXhwclBhcnNlci5jb2xsZWN0RXhwcnMoKTtcblxuICAgICAgICAgICAgdmFyIGNvbiA9IFtdO1xuICAgICAgICAgICAgY29udGFpbmVyLnB1c2goe3BhcnNlcjogZXhwclBhcnNlciwgY2hpbGRyZW46IGNvbn0pO1xuICAgICAgICAgICAgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgICAgICAgICB3YWxrKHRyZWUsIGN1ck5vZGUuZmlyc3RDaGlsZCwgY3VyTm9kZS5sYXN0Q2hpbGQsIGNvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZztcbiAgICB9IHdoaWxlIChjdXJOb2RlICE9PSBlbmROb2RlKTtcbn1cblxuXG5cbiIsIi8qKlxuICogQGZpbGUg6YWN572uXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxuZnVuY3Rpb24gQ29uZmlnKCkge1xuICAgIHRoaXMuZXhwclByZWZpeCA9ICckeyc7XG4gICAgdGhpcy5leHByU3VmZml4ID0gJ30nO1xuXG4gICAgdGhpcy5pZk5hbWUgPSAnaWYnO1xuICAgIHRoaXMuZWxpZk5hbWUgPSAnZWxpZic7XG4gICAgdGhpcy5lbHNlTmFtZSA9ICdlbHNlJztcbiAgICB0aGlzLmlmRW5kTmFtZSA9ICcvaWYnO1xuXG4gICAgdGhpcy5pZlByZWZpeFJlZ0V4cCA9IC9eXFxzKmlmOlxccyovO1xuICAgIHRoaXMuZWxpZlByZWZpeFJlZ0V4cCA9IC9eXFxzKmVsaWY6XFxzKi87XG4gICAgdGhpcy5lbHNlUHJlZml4UmVnRXhwID0gL15cXHMqZWxzZVxccyovO1xuICAgIHRoaXMuaWZFbmRQcmVmaXhSZWdFeHAgPSAvXlxccypcXC9pZlxccyovO1xuXG4gICAgdGhpcy5mb3JOYW1lID0gJ2Zvcic7XG4gICAgdGhpcy5mb3JFbmROYW1lID0gJy9mb3InO1xuXG4gICAgdGhpcy5mb3JQcmVmaXhSZWdFeHAgPSAvXlxccypmb3I6XFxzKi87XG4gICAgdGhpcy5mb3JFbmRQcmVmaXhSZWdFeHAgPSAvXlxccypcXC9mb3JcXHMqLztcbn1cblxuQ29uZmlnLnByb3RvdHlwZS5zZXRFeHByUHJlZml4ID0gZnVuY3Rpb24gKHByZWZpeCkge1xuICAgIHRoaXMuZXhwclByZWZpeCA9IHByZWZpeDtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0RXhwclN1ZmZpeCA9IGZ1bmN0aW9uIChzdWZmaXgpIHtcbiAgICB0aGlzLmV4cHJTdWZmaXggPSBzdWZmaXg7XG59O1xuXG5Db25maWcucHJvdG90eXBlLmdldEV4cHJSZWdFeHAgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmV4cHJSZWdFeHApIHtcbiAgICAgICAgdGhpcy5leHByUmVnRXhwID0gbmV3IFJlZ0V4cChyZWdFeHBFbmNvZGUodGhpcy5leHByUHJlZml4KSArICcoLispJyArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJTdWZmaXgpLCAnZycpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5leHByUmVnRXhwO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5nZXRBbGxJZlJlZ0V4cCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuYWxsSWZSZWdFeHApIHtcbiAgICAgICAgdGhpcy5hbGxJZlJlZ0V4cCA9IG5ldyBSZWdFeHAoJ1xcXFxzKignXG4gICAgICAgICAgICArIHRoaXMuaWZOYW1lICsgJ3wnXG4gICAgICAgICAgICArIHRoaXMuZWxpZk5hbWUgKyAnfCdcbiAgICAgICAgICAgICsgdGhpcy5lbHNlTmFtZSArICd8J1xuICAgICAgICAgICAgKyB0aGlzLmlmRW5kTmFtZSArICcpOlxcXFxzKicsICdnJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmFsbElmUmVnRXhwO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRJZk5hbWUgPSBmdW5jdGlvbiAoaWZOYW1lKSB7XG4gICAgdGhpcy5pZk5hbWUgPSBpZk5hbWU7XG4gICAgdGhpcy5pZlByZWZpeFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15cXFxccyonICsgaWZOYW1lICsgJzpcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0RWxpZk5hbWUgPSBmdW5jdGlvbiAoZWxpZk5hbWUpIHtcbiAgICB0aGlzLmVsaWZOYW1lID0gZWxpZk5hbWU7XG4gICAgdGhpcy5lbGlmUHJlZml4UmVnRXhwID0gbmV3IFJlZ0V4cCgnXlxcXFxzKicgKyBlbGlmTmFtZSArICc6XFxcXHMqJyk7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldEVsc2VOYW1lID0gZnVuY3Rpb24gKGVsc2VOYW1lKSB7XG4gICAgdGhpcy5lbHNlTmFtZSA9IGVsc2VOYW1lO1xuICAgIHRoaXMuZWxzZVByZWZpeFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15cXFxccyonICsgZWxzZU5hbWUgKyAnXFxcXHMqJyk7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldElmRW5kTmFtZSA9IGZ1bmN0aW9uIChpZkVuZE5hbWUpIHtcbiAgICB0aGlzLmlmRW5kTmFtZSA9IGlmRW5kTmFtZTtcbiAgICB0aGlzLmlmRW5kUHJlZml4UmVnRXhwID0gbmV3IFJlZ0V4cCgnXlxcXFxzKicgKyBpZkVuZE5hbWUgKyAnXFxcXHMqJyk7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldEZvck5hbWUgPSBmdW5jdGlvbiAoZm9yTmFtZSkge1xuICAgIHRoaXMuZm9yTmFtZSA9IGZvck5hbWU7XG4gICAgdGhpcy5mb3JQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGZvck5hbWUgKyAnOlxcXFxzKicpO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRGb3JFbmROYW1lID0gZnVuY3Rpb24gKGZvckVuZE5hbWUpIHtcbiAgICB0aGlzLmZvckVuZE5hbWUgPSBmb3JFbmROYW1lO1xuICAgIHRoaXMuZm9yRW5kUHJlZml4UmVnRXhwID0gbmV3IFJlZ0V4cCgnXlxcXFxzKicgKyBmb3JFbmROYW1lICsgJ1xcXFxzKicpO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5nZXRGb3JFeHByc1JlZ0V4cCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuZm9yRXhwcnNSZWdFeHApIHtcbiAgICAgICAgdGhpcy5mb3JFeHByc1JlZ0V4cCA9IG5ldyBSZWdFeHAoJ1xcXFxzKidcbiAgICAgICAgICAgICsgdGhpcy5mb3JOYW1lXG4gICAgICAgICAgICArICc6XFxcXHMqJ1xuICAgICAgICAgICAgKyByZWdFeHBFbmNvZGUodGhpcy5leHByUHJlZml4KVxuICAgICAgICAgICAgKyAnKFteJyArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJTdWZmaXgpXG4gICAgICAgICAgICArICddKyknICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclN1ZmZpeCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mb3JFeHByc1JlZ0V4cDtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuZ2V0Rm9ySXRlbVZhbHVlTmFtZVJlZ0V4cCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuZm9ySXRlbVZhbHVlTmFtZVJlZ0V4cCkge1xuICAgICAgICB0aGlzLmZvckl0ZW1WYWx1ZU5hbWVSZWdFeHAgPSBuZXcgUmVnRXhwKFxuICAgICAgICAgICAgJ2FzXFxcXHMqJyArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJQcmVmaXgpXG4gICAgICAgICAgICArICcoW14nICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclN1ZmZpeCkgKyAnXSspJ1xuICAgICAgICAgICAgKyByZWdFeHBFbmNvZGUodGhpcy5leHByU3VmZml4KVxuICAgICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mb3JJdGVtVmFsdWVOYW1lUmVnRXhwO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb25maWc7XG5cbmZ1bmN0aW9uIHJlZ0V4cEVuY29kZShzdHIpIHtcbiAgICByZXR1cm4gJ1xcXFwnICsgc3RyLnNwbGl0KCcnKS5qb2luKCdcXFxcJyk7XG59XG4iLCJmdW5jdGlvbiBpbmhlcml0KENoaWxkQ2xhc3MsIFBhcmVudENsYXNzKSB7XG4gICAgdmFyIGNoaWxkUHJvdG8gPSBDaGlsZENsYXNzLnByb3RvdHlwZTtcbiAgICBDaGlsZENsYXNzLnByb3RvdHlwZSA9IG5ldyBQYXJlbnRDbGFzcygpO1xuICAgIGZvciAodmFyIGtleSBpbiBjaGlsZFByb3RvKSB7XG4gICAgICAgIGlmIChjaGlsZFByb3RvLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIENoaWxkQ2xhc3MucHJvdG90eXBlW2tleV0gPSBjaGlsZFByb3RvW2tleV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIENoaWxkQ2xhc3M7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5oZXJpdDsiLCJleHBvcnRzLnNsaWNlID0gZnVuY3Rpb24gKGFyciwgc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnIsIHN0YXJ0LCBlbmQpO1xufTtcblxuLyoqXG4gKiDorqHnrpfooajovr7lvI/nmoTlgLxcbiAqXG4gKiBAaW5uZXJcbiAqIEBwYXJhbSAge3N0cmluZ30gZXhwcmVzc2lvbiDooajovr7lvI/lrZfnrKbkuLLvvIznsbvkvLzkuo4gYCR7bmFtZX1gIOS4reeahCBuYW1lXG4gKiBAcGFyYW0gIHtPYmplY3R9IGN1ckRhdGEgICAg5b2T5YmN6KGo6L6+5byP5a+55bqU55qE5pWw5o2uXG4gKiBAcmV0dXJuIHtzdHJpbmd9ICAgICAgICAgICAg6K6h566X57uT5p6cXG4gKi9cbmV4cG9ydHMuY2FsY3VsYXRlRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChleHByZXNzaW9uLCBjdXJEYXRhKSB7XG4gICAgdmFyIHBhcmFtcyA9IGdldFZhcmlhYmxlTmFtZXNGcm9tRXhwcihleHByZXNzaW9uKTtcblxuICAgIHZhciBmbkFyZ3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBwYXJhbXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICB2YXIgcGFyYW0gPSBwYXJhbXNbaV07XG4gICAgICAgIHZhciB2YWx1ZSA9IGN1ckRhdGFbcGFyYW1dO1xuICAgICAgICBmbkFyZ3MucHVzaCh2YWx1ZSA9PT0gdW5kZWZpbmVkID8gJycgOiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdDtcbiAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSAobmV3IEZ1bmN0aW9uKHBhcmFtcywgJ3JldHVybiAnICsgZXhwcmVzc2lvbikpLmFwcGx5KG51bGwsIGZuQXJncyk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIHJlc3VsdCA9ICcnO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5leHBvcnRzLmdvRGFyayA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgbm9kZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIH1cbiAgICBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIG5vZGUuX190ZXh0X18gPSBub2RlLm5vZGVWYWx1ZTtcbiAgICAgICAgbm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICB9XG59O1xuXG5leHBvcnRzLnJlc3RvcmVGcm9tRGFyayA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgbm9kZS5zdHlsZS5kaXNwbGF5ID0gbnVsbDtcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBpZiAobm9kZS5fX3RleHRfXyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBub2RlLm5vZGVWYWx1ZSA9IG5vZGUuX190ZXh0X187XG4gICAgICAgICAgICBub2RlLl9fdGV4dF9fID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0cy5jcmVhdGVFeHByRm4gPSBmdW5jdGlvbiAoZXhwclJlZ0V4cCwgZXhwcikge1xuICAgIGV4cHIgPSBleHByLnJlcGxhY2UoZXhwclJlZ0V4cCwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gYXJndW1lbnRzWzFdO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJldHVybiBleHBvcnRzLmNhbGN1bGF0ZUV4cHJlc3Npb24oZXhwciwgZGF0YSk7XG4gICAgfTtcbn07XG5cbi8qKlxuICog6LaF57qn566A5Y2V55qEIGV4dGVuZCDvvIzlm6DkuLrmnKzlupPlr7kgZXh0ZW5kIOayoemCo+mrmOeahOimgeaxgu+8jFxuICog562J5Yiw5pyJ6KaB5rGC55qE5pe25YCZ5YaN5a6M5ZaE44CCXG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0gIHtPYmplY3R9IHRhcmdldCDnm67moIflr7nosaFcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgIOacgOe7iOWQiOW5tuWQjueahOWvueixoVxuICovXG5leHBvcnRzLmV4dGVuZCA9IGZ1bmN0aW9uICh0YXJnZXQpIHtcbiAgICB2YXIgc3JjcyA9IGV4cG9ydHMuc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBzcmNzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNyY3NbaV0pIHtcbiAgICAgICAgICAgIHRhcmdldFtrZXldID0gc3Jjc1tpXVtrZXldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59O1xuXG5leHBvcnRzLnRyYXZlcnNlTm9kZXMgPSBmdW5jdGlvbiAoc3RhcnROb2RlLCBlbmROb2RlLCBub2RlRm4sIGNvbnRleHQpIHtcbiAgICB2YXIgbm9kZXMgPSBbXTtcbiAgICBmb3IgKHZhciBjdXJOb2RlID0gc3RhcnROb2RlO1xuICAgICAgICBjdXJOb2RlICYmIGN1ck5vZGUgIT09IGVuZE5vZGU7XG4gICAgICAgIGN1ck5vZGUgPSBjdXJOb2RlLm5leHRTaWJsaW5nXG4gICAgKSB7XG4gICAgICAgIG5vZGVzLnB1c2goY3VyTm9kZSk7XG4gICAgfVxuXG4gICAgbm9kZXMucHVzaChlbmROb2RlKTtcblxuICAgIGV4cG9ydHMuZWFjaChub2Rlcywgbm9kZUZuLCBjb250ZXh0KTtcbn07XG5cbmV4cG9ydHMuZWFjaCA9IGZ1bmN0aW9uIChhcnIsIGZuLCBjb250ZXh0KSB7XG4gICAgaWYgKGV4cG9ydHMuaXNBcnJheShhcnIpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGFyci5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZm4uY2FsbChjb250ZXh0LCBhcnJbaV0sIGksIGFycikpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgYXJyID09PSAnb2JqZWN0Jykge1xuICAgICAgICBmb3IgKHZhciBrIGluIGFycikge1xuICAgICAgICAgICAgaWYgKGZuLmNhbGwoY29udGV4dCwgYXJyW2tdLCBrLCBhcnIpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5leHBvcnRzLmlzQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09PSAnb2JqZWN0IEFycmF5Jztcbn07XG5cbi8qKlxuICog5LuO6KGo6L6+5byP5Lit5oq956a75Ye65Y+Y6YeP5ZCNXG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV4cHIg6KGo6L6+5byP5a2X56ym5Liy77yM57G75Ly85LqOIGAke25hbWV9YCDkuK3nmoQgbmFtZVxuICogQHJldHVybiB7QXJyYXkuPHN0cmluZz59ICAgICAg5Y+Y6YeP5ZCN5pWw57uEXG4gKi9cbnZhciBleHByTmFtZU1hcCA9IHt9O1xudmFyIGV4cHJOYW1lUmVnRXhwID0gL1xcLj9cXCQ/KFthLXp8QS1aXSt8KFthLXp8QS1aXStbMC05XStbYS16fEEtWl0qKSkvZztcbmZ1bmN0aW9uIGdldFZhcmlhYmxlTmFtZXNGcm9tRXhwcihleHByKSB7XG4gICAgaWYgKGV4cHJOYW1lTWFwW2V4cHJdKSB7XG4gICAgICAgIHJldHVybiBleHByTmFtZU1hcFtleHByXTtcbiAgICB9XG5cbiAgICB2YXIgbWF0Y2hlcyA9IGV4cHIubWF0Y2goZXhwck5hbWVSZWdFeHApIHx8IFtdO1xuICAgIHZhciBuYW1lcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IG1hdGNoZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICBpZiAobWF0Y2hlc1tpXSAmJiBtYXRjaGVzW2ldWzBdICE9PSAnLicpIHtcbiAgICAgICAgICAgIG5hbWVzLnB1c2gobWF0Y2hlc1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBleHByTmFtZU1hcFtleHByXSA9IG5hbWVzO1xuXG4gICAgcmV0dXJuIG5hbWVzO1xufVxuIiwidmFyIFRyZWUgPSByZXF1aXJlKCcuLi8uLi9pbmRleCcpO1xudmFyIENvbmZpZyA9IHJlcXVpcmUoJy4uLy4uL3NyYy9jb25maWcnKTtcblxudmFyIHRyZWUgPSBuZXcgVHJlZSh7XG4gICAgc3RhcnROb2RlOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdE5vZGUnKSxcbiAgICBlbmROb2RlOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdE5vZGUnKSxcbiAgICBjb25maWc6IG5ldyBDb25maWcoKVxufSk7XG5cbnRyZWUudHJhdmVyc2UoKTtcbmNvbnNvbGUubG9nKHRyZWUpO1xuXG50cmVlLnNldERhdGEoe1xuICAgIGxpc3Q6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogJ3poYW5nc2FuJ1xuICAgICAgICB9XG4gICAgXVxufSk7XG5cbnRyZWUuc2V0RGF0YSh7XG4gICAgbGlzdDogW1xuICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiAnbGlzaSdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogJ3poYW5nc2FuJ1xuICAgICAgICB9XG4gICAgXVxufSk7XG5cbndpbmRvdy50cmVlID0gdHJlZTsiXX0=
