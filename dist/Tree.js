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


},{"./ExprParser":3,"./inherit":8,"./utils":9}],2:[function(require,module,exports){
var utils = require('./utils');

function ExprCalculater() {
    this.fns = {};

    this.exprNameMap = {};
    this.exprNameRegExp = /\.?\$?([a-z|A-Z]+|([a-z|A-Z]+[0-9]+[a-z|A-Z]*))/g;
}

ExprCalculater.prototype.createExprFn = function (expr, avoidReturn) {
    avoidReturn = !!avoidReturn;
    this.fns[expr] = this.fns[expr] || {};
    if (this.fns[expr][avoidReturn]) {
        return;
    }

    var params = getVariableNamesFromExpr(this, expr);
    var fn = new Function(params, (avoidReturn ? '' : 'return ') + expr);

    this.fns[expr][avoidReturn] = {
        paramNames: params,
        fn: fn
    };
};

ExprCalculater.prototype.calculate = function (expr, avoidReturn, data) {
    var fnObj = this.fns[expr][avoidReturn];
    if (!fnObj) {
        throw new Error('no such expression function created!');
    }

    var fnArgs = [];
    for (var i = 0, il = fnObj.paramNames.length; i < il; i++) {
        var param = fnObj.paramNames[i];
        var value = data[param];
        fnArgs.push(value === undefined ? '' : value);
    }

    var result;
    try {
        result = fnObj.fn.apply(null, fnArgs);
    }
    catch (e) {
        result = '';
    }
    return result;
};

module.exports = ExprCalculater;

/**
 * 从表达式中抽离出变量名
 *
 * @inner
 * @param {ExprCalculater} me 对应实例
 * @param  {string} expr 表达式字符串，类似于 `${name}` 中的 name
 * @return {Array.<string>}      变量名数组
 */
function getVariableNamesFromExpr(me, expr) {
    if (me.exprNameMap[expr]) {
        return me.exprNameMap[expr];
    }

    var matches = expr.match(me.exprNameRegExp) || [];
    var names = {};
    for (var i = 0, il = matches.length; i < il; i++) {
        if (matches[i] && matches[i][0] !== '.') {
            names[matches[i]] = true;
        }
    }

    var ret = [];
    utils.each(names, function (isOk, name) {
        if (isOk) {
            ret.push(name);
        }
    });
    me.exprNameMap[expr] = ret;

    return ret;
}

},{"./utils":9}],3:[function(require,module,exports){
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

},{"./Parser":6,"./inherit":8,"./utils":9}],4:[function(require,module,exports){
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
    Parser.prototype.initialize.apply(this, arguments);

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
    this.exprFn = utils.createExprFn(this.config.getExprRegExp(), this.expr, this.exprCalculater);
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

},{"./Parser":6,"./inherit":8,"./utils":9}],5:[function(require,module,exports){
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
    Parser.prototype.initialize.apply(this, arguments);

    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;

    this.exprs = [];
    this.exprFns = {};
};

IfDirectiveParser.prototype.collectExprs = function () {
    var branches = [];
    var branchIndex = -1;

    utils.traverseNodes(this.startNode, this.endNode, function (curNode) {
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
                    this.exprFns[expr] = utils.createExprFn(this.config.getExprRegExp(), expr, this.exprCalculater);
                }
            }
            else if (nodeType === 3) {
                this.hasElseBranch = true;
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
            return true;
        }
    }, this);

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

    if (this.hasElseBranch) {
        return i;
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

},{"./Parser":6,"./inherit":8,"./utils":9}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
/**
 * @file 最终的树
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var IfDirectiveParser = require('./IfDirectiveParser');
var ExprParser = require('./EventExprParser');
var ForDirectiveParser = require('./ForDirectiveParser');
var utils = require('./utils');
var ExprCalculater = require('./ExprCalculater');

function Tree(options) {
    this.startNode = options.startNode;
    this.endNode = options.endNode;
    this.config = options.config;
    this.exprCalculater = new ExprCalculater();

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
    utils.traverseNoChangeNodes(this.startNode, this.endNode, function (curNode) {
        if (curNode.nodeType === 1 || curNode.nodeType === 3) {
            utils.goDark(curNode);
        }
    }, this);
};

Tree.prototype.restoreFromDark = function () {
    utils.traverseNoChangeNodes(this.startNode, this.endNode, function (curNode) {
        if (curNode.nodeType === 1 || curNode.nodeType === 3) {
            utils.restoreFromDark(curNode);
        }
    }, this);
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
                config: tree.config,
                exprCalculater: tree.exprCalculater
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
                Tree: Tree,
                exprCalculater: tree.exprCalculater
            });

            forDirectiveParser.collectExprs();
            container.push({parser: forDirectiveParser});

            curNode = forEndNode.nextSibling;
            continue;
        }
        else {
            var exprParser = new ExprParser({
                node: curNode,
                config: tree.config,
                exprCalculater: tree.exprCalculater
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




},{"./EventExprParser":1,"./ExprCalculater":2,"./ForDirectiveParser":4,"./IfDirectiveParser":5,"./utils":9}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
window.Tree = module.exports = require('../src/Tree.js');
},{"../src/Tree.js":7}]},{},[10])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9FdmVudEV4cHJQYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvRXhwckNhbGN1bGF0ZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvRXhwclBhcnNlci5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9Gb3JEaXJlY3RpdmVQYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvSWZEaXJlY3RpdmVQYXJzZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvUGFyc2VyLmpzIiwiL1VzZXJzL2JhaWR1L2RvbS1kYXRhLWJpbmQvc3JjL1RyZWUuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC9zcmMvaW5oZXJpdC5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3RtcC9mYWtlXzdmNTNkNTRkLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAZmlsZSDlpITnkIbkuobkuovku7bnmoQgRXhwclBhcnNlclxuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbnZhciBFeHByUGFyc2VyID0gcmVxdWlyZSgnLi9FeHByUGFyc2VyJyk7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJy4vaW5oZXJpdCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBFdmVudEV4cHJQYXJzZXIob3B0aW9ucykge1xuICAgIEV4cHJQYXJzZXIuY2FsbCh0aGlzLCBvcHRpb25zKTtcbn1cblxuRXZlbnRFeHByUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBFeHByUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICB0aGlzLmV2ZW50cyA9IHt9O1xufTtcblxuRXZlbnRFeHByUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBFeHByUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICB0aGlzLmN1ckRhdGEgPSBkYXRhO1xufTtcblxuRXZlbnRFeHByUGFyc2VyLnByb3RvdHlwZS5hZGRFeHByID0gZnVuY3Rpb24gKGF0dHIpIHtcbiAgICBpZiAoIWF0dHIpIHtcbiAgICAgICAgcmV0dXJuIEV4cHJQYXJzZXIucHJvdG90eXBlLmFkZEV4cHIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICB2YXIgZXZlbnROYW1lID0gZ2V0RXZlbnROYW1lKGF0dHIubmFtZSwgdGhpcy5jb25maWcpO1xuICAgIGlmIChldmVudE5hbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmdldEV4cHJSZWdFeHAoKS50ZXN0KGF0dHIudmFsdWUpKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50c1tldmVudE5hbWVdID0gYXR0ci52YWx1ZTtcblxuICAgICAgICAgICAgdmFyIGV4cHIgPSBhdHRyLnZhbHVlLnJlcGxhY2UoXG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWcuZ2V0RXhwclJlZ0V4cCgpLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1sxXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgdGhpcy5leHByQ2FsY3VsYXRlci5jcmVhdGVFeHByRm4oZXhwciwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLm5vZGVbJ29uJyArIGV2ZW50TmFtZV0gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBtZS5leHByQ2FsY3VsYXRlci5jYWxjdWxhdGUoZXhwciwgdHJ1ZSwgdXRpbHMuZXh0ZW5kKHt9LCBtZS5jdXJEYXRhLCB7ZXZlbnQ6IGV2ZW50fSkpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgRXhwclBhcnNlci5wcm90b3R5cGUuYWRkRXhwci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gaW5oZXJpdChFdmVudEV4cHJQYXJzZXIsIEV4cHJQYXJzZXIpO1xuXG5cbmZ1bmN0aW9uIGdldEV2ZW50TmFtZShhdHRyTmFtZSwgY29uZmlnKSB7XG4gICAgaWYgKGF0dHJOYW1lLmluZGV4T2YoY29uZmlnLmV2ZW50UHJlZml4ICsgJy0nKSA9PT0gLTEpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHJldHVybiBhdHRyTmFtZS5yZXBsYWNlKGNvbmZpZy5ldmVudFByZWZpeCArICctJywgJycpO1xufVxuXG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIEV4cHJDYWxjdWxhdGVyKCkge1xuICAgIHRoaXMuZm5zID0ge307XG5cbiAgICB0aGlzLmV4cHJOYW1lTWFwID0ge307XG4gICAgdGhpcy5leHByTmFtZVJlZ0V4cCA9IC9cXC4/XFwkPyhbYS16fEEtWl0rfChbYS16fEEtWl0rWzAtOV0rW2EtenxBLVpdKikpL2c7XG59XG5cbkV4cHJDYWxjdWxhdGVyLnByb3RvdHlwZS5jcmVhdGVFeHByRm4gPSBmdW5jdGlvbiAoZXhwciwgYXZvaWRSZXR1cm4pIHtcbiAgICBhdm9pZFJldHVybiA9ICEhYXZvaWRSZXR1cm47XG4gICAgdGhpcy5mbnNbZXhwcl0gPSB0aGlzLmZuc1tleHByXSB8fCB7fTtcbiAgICBpZiAodGhpcy5mbnNbZXhwcl1bYXZvaWRSZXR1cm5dKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcGFyYW1zID0gZ2V0VmFyaWFibGVOYW1lc0Zyb21FeHByKHRoaXMsIGV4cHIpO1xuICAgIHZhciBmbiA9IG5ldyBGdW5jdGlvbihwYXJhbXMsIChhdm9pZFJldHVybiA/ICcnIDogJ3JldHVybiAnKSArIGV4cHIpO1xuXG4gICAgdGhpcy5mbnNbZXhwcl1bYXZvaWRSZXR1cm5dID0ge1xuICAgICAgICBwYXJhbU5hbWVzOiBwYXJhbXMsXG4gICAgICAgIGZuOiBmblxuICAgIH07XG59O1xuXG5FeHByQ2FsY3VsYXRlci5wcm90b3R5cGUuY2FsY3VsYXRlID0gZnVuY3Rpb24gKGV4cHIsIGF2b2lkUmV0dXJuLCBkYXRhKSB7XG4gICAgdmFyIGZuT2JqID0gdGhpcy5mbnNbZXhwcl1bYXZvaWRSZXR1cm5dO1xuICAgIGlmICghZm5PYmopIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyBzdWNoIGV4cHJlc3Npb24gZnVuY3Rpb24gY3JlYXRlZCEnKTtcbiAgICB9XG5cbiAgICB2YXIgZm5BcmdzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gZm5PYmoucGFyYW1OYW1lcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIHZhciBwYXJhbSA9IGZuT2JqLnBhcmFtTmFtZXNbaV07XG4gICAgICAgIHZhciB2YWx1ZSA9IGRhdGFbcGFyYW1dO1xuICAgICAgICBmbkFyZ3MucHVzaCh2YWx1ZSA9PT0gdW5kZWZpbmVkID8gJycgOiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdDtcbiAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSBmbk9iai5mbi5hcHBseShudWxsLCBmbkFyZ3MpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICByZXN1bHQgPSAnJztcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXhwckNhbGN1bGF0ZXI7XG5cbi8qKlxuICog5LuO6KGo6L6+5byP5Lit5oq956a75Ye65Y+Y6YeP5ZCNXG4gKlxuICogQGlubmVyXG4gKiBAcGFyYW0ge0V4cHJDYWxjdWxhdGVyfSBtZSDlr7nlupTlrp7kvotcbiAqIEBwYXJhbSAge3N0cmluZ30gZXhwciDooajovr7lvI/lrZfnrKbkuLLvvIznsbvkvLzkuo4gYCR7bmFtZX1gIOS4reeahCBuYW1lXG4gKiBAcmV0dXJuIHtBcnJheS48c3RyaW5nPn0gICAgICDlj5jph4/lkI3mlbDnu4RcbiAqL1xuZnVuY3Rpb24gZ2V0VmFyaWFibGVOYW1lc0Zyb21FeHByKG1lLCBleHByKSB7XG4gICAgaWYgKG1lLmV4cHJOYW1lTWFwW2V4cHJdKSB7XG4gICAgICAgIHJldHVybiBtZS5leHByTmFtZU1hcFtleHByXTtcbiAgICB9XG5cbiAgICB2YXIgbWF0Y2hlcyA9IGV4cHIubWF0Y2gobWUuZXhwck5hbWVSZWdFeHApIHx8IFtdO1xuICAgIHZhciBuYW1lcyA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IG1hdGNoZXMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICBpZiAobWF0Y2hlc1tpXSAmJiBtYXRjaGVzW2ldWzBdICE9PSAnLicpIHtcbiAgICAgICAgICAgIG5hbWVzW21hdGNoZXNbaV1dID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciByZXQgPSBbXTtcbiAgICB1dGlscy5lYWNoKG5hbWVzLCBmdW5jdGlvbiAoaXNPaywgbmFtZSkge1xuICAgICAgICBpZiAoaXNPaykge1xuICAgICAgICAgICAgcmV0LnB1c2gobmFtZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBtZS5leHByTmFtZU1hcFtleHByXSA9IHJldDtcblxuICAgIHJldHVybiByZXQ7XG59XG4iLCIvKipcbiAqIEBmaWxlIOihqOi+vuW8j+ino+aekOWZqO+8jOS4gOS4quaWh+acrOiKgueCueaIluiAheWFg+e0oOiKgueCueWvueW6lOS4gOS4quihqOi+vuW8j+ino+aekOWZqOWunuS+i1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbnZhciBQYXJzZXIgPSByZXF1aXJlKCcuL1BhcnNlcicpO1xudmFyIGluaGVyaXQgPSByZXF1aXJlKCcuL2luaGVyaXQnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuZnVuY3Rpb24gRXhwclBhcnNlcihvcHRpb25zKSB7XG4gICAgUGFyc2VyLmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG5cbkV4cHJQYXJzZXIucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIFBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5ub2RlID0gb3B0aW9ucy5ub2RlO1xuICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG5cbiAgICB0aGlzLmV4cHJzID0gW107XG4gICAgdGhpcy5leHByRm5zID0ge307XG4gICAgdGhpcy51cGRhdGVGbnMgPSB7fTtcbiAgICB0aGlzLmV4cHJPbGRWYWx1ZXMgPSB7fTtcbn07XG5cbi8qKlxuICog5pCc6ZuG6L+H56iLXG4gKlxuICogQHB1YmxpY1xuICovXG5FeHByUGFyc2VyLnByb3RvdHlwZS5jb2xsZWN0RXhwcnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1ck5vZGUgPSB0aGlzLm5vZGU7XG5cbiAgICAvLyDmlofmnKzoioLngrlcbiAgICBpZiAoY3VyTm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICB0aGlzLmFkZEV4cHIoKTtcbiAgICB9XG4gICAgLy8g5YWD57Sg6IqC54K5XG4gICAgZWxzZSBpZiAoY3VyTm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICB2YXIgYXR0cmlidXRlcyA9IGN1ck5vZGUuYXR0cmlidXRlcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlsID0gYXR0cmlidXRlcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmFkZEV4cHIoYXR0cmlidXRlc1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIOa3u+WKoOihqOi+vuW8j1xuICpcbiAqIEBwcm90ZWN0ZWRcbiAqIEBwYXJhbSB7QXR0cn0gYXR0ciDlpoLmnpzlvZPliY3mmK/lhYPntKDoioLngrnvvIzliJnopoHkvKDlhaXpgY3ljobliLDnmoTlsZ7mgKdcbiAqL1xuRXhwclBhcnNlci5wcm90b3R5cGUuYWRkRXhwciA9IGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgdmFyIGV4cHIgPSBhdHRyID8gYXR0ci52YWx1ZSA6IHRoaXMubm9kZS5ub2RlVmFsdWU7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5nZXRFeHByUmVnRXhwKCkudGVzdChleHByKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGFkZEV4cHIoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIGV4cHIsXG4gICAgICAgIGF0dHIgPyBjcmVhdGVBdHRyVXBkYXRlRm4oYXR0cikgOiAoZnVuY3Rpb24gKGN1ck5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXhwclZhbHVlKSB7XG4gICAgICAgICAgICAgICAgY3VyTm9kZS5ub2RlVmFsdWUgPSBleHByVmFsdWU7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KSh0aGlzLm5vZGUpXG4gICAgKTtcbn07XG5cbi8qKlxuICog6K6+572u5pWw5o2u6L+H56iLXG4gKlxuICogQHB1YmxpY1xuICogQHBhcmFtIHtPYmplY3R9IGRhdGEg5pWw5o2uXG4gKi9cbkV4cHJQYXJzZXIucHJvdG90eXBlLnNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBleHBycyA9IHRoaXMuZXhwcnM7XG4gICAgdmFyIGV4cHJPbGRWYWx1ZXMgPSB0aGlzLmV4cHJPbGRWYWx1ZXM7XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gZXhwcnMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICB2YXIgZXhwciA9IGV4cHJzW2ldO1xuICAgICAgICB2YXIgZXhwclZhbHVlID0gdGhpcy5leHByRm5zW2V4cHJdKGRhdGEpO1xuXG4gICAgICAgIGlmICh0aGlzLmRpcnR5Q2hlY2soZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWVzW2V4cHJdKSkge1xuICAgICAgICAgICAgdmFyIHVwZGF0ZUZucyA9IHRoaXMudXBkYXRlRm5zW2V4cHJdO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDAsIGpsID0gdXBkYXRlRm5zLmxlbmd0aDsgaiA8IGpsOyBqKyspIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVGbnNbal0oZXhwclZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cHJPbGRWYWx1ZXNbZXhwcl0gPSBleHByVmFsdWU7XG4gICAgfVxufTtcblxuLyoqXG4gKiDoioLngrnigJzpmpDol4/igJ3otbfmnaVcbiAqXG4gKiBAcHVibGljXG4gKi9cbkV4cHJQYXJzZXIucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy5nb0RhcmsodGhpcy5ub2RlKTtcbn07XG5cbi8qKlxuICog6IqC54K54oCc5pi+56S64oCd5Ye65p2lXG4gKlxuICogQHB1YmxpY1xuICovXG5FeHByUGFyc2VyLnByb3RvdHlwZS5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgdXRpbHMucmVzdG9yZUZyb21EYXJrKHRoaXMubm9kZSk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gaW5oZXJpdChFeHByUGFyc2VyLCBQYXJzZXIpO1xuXG5mdW5jdGlvbiBjcmVhdGVBdHRyVXBkYXRlRm4oYXR0cikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZXhwclZhbHVlKSB7XG4gICAgICAgIGF0dHIudmFsdWUgPSBleHByVmFsdWU7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gYWRkRXhwcihwYXJzZXIsIGV4cHIsIHVwZGF0ZUZuKSB7XG4gICAgcGFyc2VyLmV4cHJzLnB1c2goZXhwcik7XG4gICAgaWYgKCFwYXJzZXIuZXhwckZuc1tleHByXSkge1xuICAgICAgICBwYXJzZXIuZXhwckZuc1tleHByXSA9IGNyZWF0ZUV4cHJGbihwYXJzZXIsIGV4cHIpO1xuICAgIH1cbiAgICBwYXJzZXIudXBkYXRlRm5zW2V4cHJdID0gcGFyc2VyLnVwZGF0ZUZuc1tleHByXSB8fCBbXTtcbiAgICBwYXJzZXIudXBkYXRlRm5zW2V4cHJdLnB1c2godXBkYXRlRm4pO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFeHByRm4ocGFyc2VyLCBleHByKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJldHVybiBleHByLnJlcGxhY2UocGFyc2VyLmNvbmZpZy5nZXRFeHByUmVnRXhwKCksIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHBhcnNlci5leHByQ2FsY3VsYXRlci5jcmVhdGVFeHByRm4oYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZXIuZXhwckNhbGN1bGF0ZXIuY2FsY3VsYXRlKGFyZ3VtZW50c1sxXSwgZmFsc2UsIGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9O1xufVxuIiwiLyoqXG4gKiBAZmlsZSBmb3Ig5oyH5LukXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxudmFyIGluaGVyaXQgPSByZXF1aXJlKCcuL2luaGVyaXQnKTtcbnZhciBQYXJzZXIgPSByZXF1aXJlKCcuL1BhcnNlcicpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBGb3JEaXJlY3RpdmVQYXJzZXIob3B0aW9ucykge1xuICAgIFBhcnNlci5jYWxsKHRoaXMsIG9wdGlvbnMpO1xufVxuXG5Gb3JEaXJlY3RpdmVQYXJzZXIucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIFBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5zdGFydE5vZGUgPSBvcHRpb25zLnN0YXJ0Tm9kZTtcbiAgICB0aGlzLmVuZE5vZGUgPSBvcHRpb25zLmVuZE5vZGU7XG4gICAgdGhpcy5jb25maWcgPSBvcHRpb25zLmNvbmZpZztcbiAgICB0aGlzLlRyZWUgPSBvcHRpb25zLlRyZWU7XG59O1xuXG5Gb3JEaXJlY3RpdmVQYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5zdGFydE5vZGUubmV4dFNpYmxpbmcgPT09IHRoaXMuZW5kTm9kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHRwbFNlZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHV0aWxzLnRyYXZlcnNlTm9kZXModGhpcy5zdGFydE5vZGUsIHRoaXMuZW5kTm9kZSwgZnVuY3Rpb24gKGN1ck5vZGUpIHtcbiAgICAgICAgaWYgKGN1ck5vZGUgPT09IHRoaXMuc3RhcnROb2RlIHx8IGN1ck5vZGUgPT09IHRoaXMuZW5kTm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdHBsU2VnLmFwcGVuZENoaWxkKGN1ck5vZGUpO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMudHBsU2VnID0gdHBsU2VnO1xuXG4gICAgdGhpcy5leHByID0gdGhpcy5zdGFydE5vZGUubm9kZVZhbHVlLm1hdGNoKHRoaXMuY29uZmlnLmdldEZvckV4cHJzUmVnRXhwKCkpWzFdO1xuICAgIHRoaXMuZXhwckZuID0gdXRpbHMuY3JlYXRlRXhwckZuKHRoaXMuY29uZmlnLmdldEV4cHJSZWdFeHAoKSwgdGhpcy5leHByLCB0aGlzLmV4cHJDYWxjdWxhdGVyKTtcbiAgICB0aGlzLnVwZGF0ZUZuID0gY3JlYXRlVXBkYXRlRm4oXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHRoaXMuVHJlZSxcbiAgICAgICAgdGhpcy5zdGFydE5vZGUubmV4dFNpYmxpbmcsXG4gICAgICAgIHRoaXMuZW5kTm9kZS5wcmV2aW91c1NpYmxpbmcsXG4gICAgICAgIHRoaXMuY29uZmlnLFxuICAgICAgICB0aGlzLnN0YXJ0Tm9kZS5ub2RlVmFsdWVcbiAgICApO1xufTtcblxuRm9yRGlyZWN0aXZlUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoIXRoaXMuZXhwcikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGV4cHJWYWx1ZSA9IHRoaXMuZXhwckZuKGRhdGEpO1xuICAgIGlmICh0aGlzLmRpcnR5Q2hlY2sodGhpcy5leHByLCBleHByVmFsdWUsIHRoaXMuZXhwck9sZFZhbHVlKSkge1xuICAgICAgICB0aGlzLnVwZGF0ZUZuKGV4cHJWYWx1ZSwgZGF0YSk7XG4gICAgfVxuXG4gICAgdGhpcy5leHByT2xkVmFsdWUgPSBleHByVmFsdWU7XG59O1xuXG5Gb3JEaXJlY3RpdmVQYXJzZXIuaXNGb3JOb2RlID0gZnVuY3Rpb24gKG5vZGUsIGNvbmZpZykge1xuICAgIHJldHVybiBub2RlLm5vZGVUeXBlID09PSA4ICYmIGNvbmZpZy5mb3JQcmVmaXhSZWdFeHAudGVzdChub2RlLm5vZGVWYWx1ZSk7XG59O1xuXG5Gb3JEaXJlY3RpdmVQYXJzZXIuaXNGb3JFbmROb2RlID0gZnVuY3Rpb24gKG5vZGUsIGNvbmZpZykge1xuICAgIHJldHVybiBub2RlLm5vZGVUeXBlID09PSA4ICYmIGNvbmZpZy5mb3JFbmRQcmVmaXhSZWdFeHAudGVzdChub2RlLm5vZGVWYWx1ZSk7XG59O1xuXG5Gb3JEaXJlY3RpdmVQYXJzZXIuZmluZEZvckVuZCA9IGZ1bmN0aW9uIChmb3JTdGFydE5vZGUsIGNvbmZpZykge1xuICAgIHZhciBjdXJOb2RlID0gZm9yU3RhcnROb2RlO1xuICAgIHdoaWxlICgoY3VyTm9kZSA9IGN1ck5vZGUubmV4dFNpYmxpbmcpKSB7XG4gICAgICAgIGlmIChGb3JEaXJlY3RpdmVQYXJzZXIuaXNGb3JFbmROb2RlKGN1ck5vZGUsIGNvbmZpZykpIHtcbiAgICAgICAgICAgIHJldHVybiBjdXJOb2RlO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbmhlcml0KEZvckRpcmVjdGl2ZVBhcnNlciwgUGFyc2VyKTtcblxuZnVuY3Rpb24gY3JlYXRlVXBkYXRlRm4ocGFyc2VyLCBUcmVlLCBzdGFydE5vZGUsIGVuZE5vZGUsIGNvbmZpZywgZnVsbEV4cHIpIHtcbiAgICB2YXIgdHJlZXMgPSBbXTtcbiAgICB2YXIgaXRlbVZhcmlhYmxlTmFtZSA9IGZ1bGxFeHByLm1hdGNoKHBhcnNlci5jb25maWcuZ2V0Rm9ySXRlbVZhbHVlTmFtZVJlZ0V4cCgpKVsxXTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGV4cHJWYWx1ZSwgZGF0YSkge1xuICAgICAgICB2YXIgaW5kZXggPSAwO1xuICAgICAgICBmb3IgKHZhciBrIGluIGV4cHJWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKCF0cmVlc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgICB0cmVlc1tpbmRleF0gPSBjcmVhdGVUcmVlKHBhcnNlciwgVHJlZSwgY29uZmlnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdHJlZXNbaW5kZXhdLnJlc3RvcmVGcm9tRGFyaygpO1xuICAgICAgICAgICAgdHJlZXNbaW5kZXhdLnNldERpcnR5Q2hlY2tlcihwYXJzZXIuZGlydHlDaGVja2VyKTtcblxuICAgICAgICAgICAgdmFyIGxvY2FsID0ge1xuICAgICAgICAgICAgICAgIGtleTogayxcbiAgICAgICAgICAgICAgICBpbmRleDogaW5kZXhcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBsb2NhbFtpdGVtVmFyaWFibGVOYW1lXSA9IGV4cHJWYWx1ZVtrXTtcbiAgICAgICAgICAgIHRyZWVzW2luZGV4XS5zZXREYXRhKHV0aWxzLmV4dGVuZCh7fSwgZGF0YSwgbG9jYWwpKTtcblxuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSBpbmRleCwgaWwgPSB0cmVlcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgICAgICB0cmVlc1tpXS5nb0RhcmsoKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRyZWUocGFyc2VyLCBUcmVlLCBjb25maWcpIHtcbiAgICB2YXIgY29weVNlZyA9IHBhcnNlci50cGxTZWcuY2xvbmVOb2RlKHRydWUpO1xuICAgIHZhciBzdGFydE5vZGUgPSBjb3B5U2VnLmZpcnN0Q2hpbGQ7XG4gICAgdmFyIGVuZE5vZGUgPSBjb3B5U2VnLmxhc3RDaGlsZDtcbiAgICB1dGlscy50cmF2ZXJzZU5vZGVzKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgZnVuY3Rpb24gKGN1ck5vZGUpIHtcbiAgICAgICAgcGFyc2VyLmVuZE5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoY3VyTm9kZSwgcGFyc2VyLmVuZE5vZGUpO1xuICAgIH0pO1xuXG4gICAgdmFyIHRyZWUgPSBuZXcgVHJlZSh7XG4gICAgICAgIHN0YXJ0Tm9kZTogc3RhcnROb2RlLFxuICAgICAgICBlbmROb2RlOiBlbmROb2RlLFxuICAgICAgICBjb25maWc6IGNvbmZpZ1xuICAgIH0pO1xuICAgIHRyZWUudHJhdmVyc2UoKTtcbiAgICByZXR1cm4gdHJlZTtcbn1cbiIsIi8qKlxuICogQGZpbGUgaWYg5oyH5LukXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxudmFyIFBhcnNlciA9IHJlcXVpcmUoJy4vUGFyc2VyJyk7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJy4vaW5oZXJpdCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBJZkRpcmVjdGl2ZVBhcnNlcihvcHRpb25zKSB7XG4gICAgUGFyc2VyLmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG5cbklmRGlyZWN0aXZlUGFyc2VyLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBQYXJzZXIucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHRoaXMuc3RhcnROb2RlID0gb3B0aW9ucy5zdGFydE5vZGU7XG4gICAgdGhpcy5lbmROb2RlID0gb3B0aW9ucy5lbmROb2RlO1xuICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG5cbiAgICB0aGlzLmV4cHJzID0gW107XG4gICAgdGhpcy5leHByRm5zID0ge307XG59O1xuXG5JZkRpcmVjdGl2ZVBhcnNlci5wcm90b3R5cGUuY29sbGVjdEV4cHJzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBicmFuY2hlcyA9IFtdO1xuICAgIHZhciBicmFuY2hJbmRleCA9IC0xO1xuXG4gICAgdXRpbHMudHJhdmVyc2VOb2Rlcyh0aGlzLnN0YXJ0Tm9kZSwgdGhpcy5lbmROb2RlLCBmdW5jdGlvbiAoY3VyTm9kZSkge1xuICAgICAgICB2YXIgbm9kZVR5cGUgPSBnZXRJZk5vZGVUeXBlKGN1ck5vZGUsIHRoaXMuY29uZmlnKTtcblxuICAgICAgICBpZiAobm9kZVR5cGUpIHtcbiAgICAgICAgICAgIHNldEVuZE5vZGUoY3VyTm9kZSwgYnJhbmNoZXMsIGJyYW5jaEluZGV4KTtcblxuICAgICAgICAgICAgYnJhbmNoSW5kZXgrKztcbiAgICAgICAgICAgIGJyYW5jaGVzW2JyYW5jaEluZGV4XSA9IGJyYW5jaGVzW2JyYW5jaEluZGV4XSB8fCB7fTtcblxuICAgICAgICAgICAgLy8g5pivIGlmIOiKgueCueaIluiAhSBlbGlmIOiKgueCue+8jOaQnOmbhuihqOi+vuW8j1xuICAgICAgICAgICAgaWYgKG5vZGVUeXBlIDwgMykge1xuICAgICAgICAgICAgICAgIHZhciBleHByID0gY3VyTm9kZS5ub2RlVmFsdWUucmVwbGFjZSh0aGlzLmNvbmZpZy5nZXRBbGxJZlJlZ0V4cCgpLCAnJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5leHBycy5wdXNoKGV4cHIpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmV4cHJGbnNbZXhwcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5leHByRm5zW2V4cHJdID0gdXRpbHMuY3JlYXRlRXhwckZuKHRoaXMuY29uZmlnLmdldEV4cHJSZWdFeHAoKSwgZXhwciwgdGhpcy5leHByQ2FsY3VsYXRlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhc0Vsc2VCcmFuY2ggPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFicmFuY2hlc1ticmFuY2hJbmRleF0uc3RhcnROb2RlKSB7XG4gICAgICAgICAgICAgICAgYnJhbmNoZXNbYnJhbmNoSW5kZXhdLnN0YXJ0Tm9kZSA9IGN1ck5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZztcbiAgICAgICAgaWYgKCFjdXJOb2RlIHx8IGN1ck5vZGUgPT09IHRoaXMuZW5kTm9kZSkge1xuICAgICAgICAgICAgc2V0RW5kTm9kZShjdXJOb2RlLCBicmFuY2hlcywgYnJhbmNoSW5kZXgpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9LCB0aGlzKTtcblxuICAgIHJldHVybiBicmFuY2hlcztcblxuICAgIGZ1bmN0aW9uIHNldEVuZE5vZGUoY3VyTm9kZSwgYnJhbmNoZXMsIGJyYW5jaEluZGV4KSB7XG4gICAgICAgIGlmIChicmFuY2hJbmRleCArIDEgJiYgYnJhbmNoZXNbYnJhbmNoSW5kZXhdLnN0YXJ0Tm9kZSkge1xuICAgICAgICAgICAgYnJhbmNoZXNbYnJhbmNoSW5kZXhdLmVuZE5vZGUgPSBjdXJOb2RlLnByZXZpb3VzU2libGluZztcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbklmRGlyZWN0aXZlUGFyc2VyLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgZXhwcnMgPSB0aGlzLmV4cHJzO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGV4cHJzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgdmFyIGV4cHIgPSBleHByc1tpXTtcbiAgICAgICAgdmFyIGV4cHJWYWx1ZSA9IHRoaXMuZXhwckZuc1tleHByXShkYXRhKTtcbiAgICAgICAgaWYgKGV4cHJWYWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5oYXNFbHNlQnJhbmNoKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgIH1cbn07XG5cbklmRGlyZWN0aXZlUGFyc2VyLmlzSWZOb2RlID0gZnVuY3Rpb24gKG5vZGUsIGNvbmZpZykge1xuICAgIHJldHVybiBnZXRJZk5vZGVUeXBlKG5vZGUsIGNvbmZpZykgPT09IDE7XG59O1xuXG5JZkRpcmVjdGl2ZVBhcnNlci5pc0VsaWZOb2RlID0gZnVuY3Rpb24gKG5vZGUsIGNvbmZpZykge1xuICAgIHJldHVybiBnZXRJZk5vZGVUeXBlKG5vZGUsIGNvbmZpZykgPT09IDI7XG59O1xuXG5JZkRpcmVjdGl2ZVBhcnNlci5pc0Vsc2VOb2RlID0gZnVuY3Rpb24gKG5vZGUsIGNvbmZpZykge1xuICAgIHJldHVybiBnZXRJZk5vZGVUeXBlKG5vZGUsIGNvbmZpZykgPT09IDM7XG59O1xuXG5JZkRpcmVjdGl2ZVBhcnNlci5pc0lmRW5kTm9kZSA9IGZ1bmN0aW9uIChub2RlLCBjb25maWcpIHtcbiAgICByZXR1cm4gZ2V0SWZOb2RlVHlwZShub2RlLCBjb25maWcpID09PSA0O1xufTtcblxuSWZEaXJlY3RpdmVQYXJzZXIuZmluZElmRW5kID0gZnVuY3Rpb24gKGlmU3RhcnROb2RlLCBjb25maWcpIHtcbiAgICB2YXIgY3VyTm9kZSA9IGlmU3RhcnROb2RlO1xuICAgIHdoaWxlICgoY3VyTm9kZSA9IGN1ck5vZGUubmV4dFNpYmxpbmcpKSB7XG4gICAgICAgIGlmIChJZkRpcmVjdGl2ZVBhcnNlci5pc0lmRW5kTm9kZShjdXJOb2RlLCBjb25maWcpKSB7XG4gICAgICAgICAgICByZXR1cm4gY3VyTm9kZTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gaW5oZXJpdChJZkRpcmVjdGl2ZVBhcnNlciwgUGFyc2VyKTtcblxuZnVuY3Rpb24gZ2V0SWZOb2RlVHlwZShub2RlLCBjb25maWcpIHtcbiAgICBpZiAobm9kZS5ub2RlVHlwZSAhPT0gOCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5pZlByZWZpeFJlZ0V4cC50ZXN0KG5vZGUubm9kZVZhbHVlKSkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLmVsaWZQcmVmaXhSZWdFeHAudGVzdChub2RlLm5vZGVWYWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIDI7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5lbHNlUHJlZml4UmVnRXhwLnRlc3Qobm9kZS5ub2RlVmFsdWUpKSB7XG4gICAgICAgIHJldHVybiAzO1xuICAgIH1cblxuICAgIGlmIChjb25maWcuaWZFbmRQcmVmaXhSZWdFeHAudGVzdChub2RlLm5vZGVWYWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIDQ7XG4gICAgfVxufVxuIiwiLyoqXG4gKiBAZmlsZSDop6PmnpDlmajnmoTmir3osaHln7rnsbtcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG4vKipcbiAqIOaehOmAoOWHveaVsFxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMg6YWN572u5Y+C5pWw77yM5LiA6Iis5Y+v6IO95Lya5pyJ5aaC5LiL5YaF5a6577yaXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnROb2RlOiAuLi4sXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kTm9kZTogLi4uLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGU6IC4uLixcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25maWc6IC4uLlxuICogICAgICAgICAgICAgICAgICAgICAgICAgfVxuICogICAgICAgICAgICAgICAgICAgICAgICAg5YW35L2T5piv5ZWl5Y+v5Lul5Y+C5Yqg5YW35L2T55qE5a2Q57G7XG4gKi9cbmZ1bmN0aW9uIFBhcnNlcihvcHRpb25zKSB7XG4gICAgdGhpcy5pbml0aWFsaXplKG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIOWIneWni+WMllxuICpcbiAqIEBwcm90ZWN0ZWTDn1xuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMg5p2l6Ieq5LqO5p6E6YCg5Ye95pWwXG4gKi9cblBhcnNlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdGhpcy5leHByQ2FsY3VsYXRlciA9IG9wdGlvbnMuZXhwckNhbGN1bGF0ZXI7XG59O1xuXG4vKipcbiAqIOmUgOavgeino+aekOWZqFxuICpcbiAqIEBwdWJsaWNcbiAqIEBhYnN0cmFjdFxuICovXG5QYXJzZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDorr7nva7mlbDmja5cbiAqXG4gKiBAcHVibGljXG4gKiBAYWJzdHJhY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIOimgeiuvue9rueahOaVsOaNrlxuICovXG5QYXJzZXIucHJvdG90eXBlLnNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge307XG5cbi8qKlxuICog6ZqQ6JeP55u45YWz5YWD57SgXG4gKlxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vKipcbiAqIOaYvuekuuebuOWFs+WFg+e0oFxuICpcbiAqIEBwdWJsaWNcbiAqL1xuUGFyc2VyLnByb3RvdHlwZS5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAoKSB7fTtcblxuLyoqXG4gKiDmkJzpm4booajovr7lvI/vvIznlJ/miJDooajovr7lvI/lh73mlbDlkowgRE9NIOabtOaWsOWHveaVsFxuICpcbiAqIEBhYnN0cmFjdFxuICogQHB1YmxpY1xuICovXG5QYXJzZXIucHJvdG90eXBlLmNvbGxlY3RFeHBycyA9IGZ1bmN0aW9uICgpIHt9O1xuXG5QYXJzZXIucHJvdG90eXBlLmRpcnR5Q2hlY2sgPSBmdW5jdGlvbiAoZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWUpIHtcbiAgICB2YXIgZGlydHlDaGVja2VyRm4gPSB0aGlzLmRpcnR5Q2hlY2tlciA/IHRoaXMuZGlydHlDaGVja2VyLmdldENoZWNrZXIoZXhwcikgOiBudWxsO1xuICAgIHJldHVybiAoZGlydHlDaGVja2VyRm4gJiYgZGlydHlDaGVja2VyRm4oZXhwciwgZXhwclZhbHVlLCBleHByT2xkVmFsdWUpKVxuICAgICAgICAgICAgfHwgKCFkaXJ0eUNoZWNrZXJGbiAmJiBleHByVmFsdWUgIT09IGV4cHJPbGRWYWx1ZSk7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLnNldERpcnR5Q2hlY2tlciA9IGZ1bmN0aW9uIChkaXJ0eUNoZWNrZXIpIHtcbiAgICB0aGlzLmRpcnR5Q2hlY2tlciA9IGRpcnR5Q2hlY2tlcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGFyc2VyO1xuIiwiLyoqXG4gKiBAZmlsZSDmnIDnu4jnmoTmoJFcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG52YXIgSWZEaXJlY3RpdmVQYXJzZXIgPSByZXF1aXJlKCcuL0lmRGlyZWN0aXZlUGFyc2VyJyk7XG52YXIgRXhwclBhcnNlciA9IHJlcXVpcmUoJy4vRXZlbnRFeHByUGFyc2VyJyk7XG52YXIgRm9yRGlyZWN0aXZlUGFyc2VyID0gcmVxdWlyZSgnLi9Gb3JEaXJlY3RpdmVQYXJzZXInKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBFeHByQ2FsY3VsYXRlciA9IHJlcXVpcmUoJy4vRXhwckNhbGN1bGF0ZXInKTtcblxuZnVuY3Rpb24gVHJlZShvcHRpb25zKSB7XG4gICAgdGhpcy5zdGFydE5vZGUgPSBvcHRpb25zLnN0YXJ0Tm9kZTtcbiAgICB0aGlzLmVuZE5vZGUgPSBvcHRpb25zLmVuZE5vZGU7XG4gICAgdGhpcy5jb25maWcgPSBvcHRpb25zLmNvbmZpZztcbiAgICB0aGlzLmV4cHJDYWxjdWxhdGVyID0gbmV3IEV4cHJDYWxjdWxhdGVyKCk7XG5cbiAgICB0aGlzLnRyZWUgPSBbXTtcbn1cblxuVHJlZS5wcm90b3R5cGUudHJhdmVyc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgd2Fsayh0aGlzLCB0aGlzLnN0YXJ0Tm9kZSwgdGhpcy5lbmROb2RlLCB0aGlzLnRyZWUpO1xufTtcblxuVHJlZS5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgZGF0YSA9IGRhdGEgfHwge307XG4gICAgd2Fsa1BhcnNlcnModGhpcywgdGhpcy50cmVlLCBkYXRhKTtcbn07XG5cblRyZWUucHJvdG90eXBlLmdvRGFyayA9IGZ1bmN0aW9uICgpIHtcbiAgICB1dGlscy50cmF2ZXJzZU5vQ2hhbmdlTm9kZXModGhpcy5zdGFydE5vZGUsIHRoaXMuZW5kTm9kZSwgZnVuY3Rpb24gKGN1ck5vZGUpIHtcbiAgICAgICAgaWYgKGN1ck5vZGUubm9kZVR5cGUgPT09IDEgfHwgY3VyTm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICAgICAgdXRpbHMuZ29EYXJrKGN1ck5vZGUpO1xuICAgICAgICB9XG4gICAgfSwgdGhpcyk7XG59O1xuXG5UcmVlLnByb3RvdHlwZS5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgdXRpbHMudHJhdmVyc2VOb0NoYW5nZU5vZGVzKHRoaXMuc3RhcnROb2RlLCB0aGlzLmVuZE5vZGUsIGZ1bmN0aW9uIChjdXJOb2RlKSB7XG4gICAgICAgIGlmIChjdXJOb2RlLm5vZGVUeXBlID09PSAxIHx8IGN1ck5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgICAgIHV0aWxzLnJlc3RvcmVGcm9tRGFyayhjdXJOb2RlKTtcbiAgICAgICAgfVxuICAgIH0sIHRoaXMpO1xufTtcblxuVHJlZS5wcm90b3R5cGUuc2V0RGlydHlDaGVja2VyID0gZnVuY3Rpb24gKGRpcnR5Q2hlY2tlcikge1xuICAgIHRoaXMuZGlydHlDaGVja2VyID0gZGlydHlDaGVja2VyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUcmVlO1xuXG5mdW5jdGlvbiB3YWxrUGFyc2Vycyh0cmVlLCBwYXJzZXJzLCBkYXRhKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gcGFyc2Vycy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIHZhciBwYXJzZXJPYmogPSBwYXJzZXJzW2ldO1xuICAgICAgICBwYXJzZXJPYmoucGFyc2VyLnNldERpcnR5Q2hlY2tlcih0cmVlLmRpcnR5Q2hlY2tlcik7XG4gICAgICAgIHBhcnNlck9iai5kYXRhID0gdXRpbHMuZXh0ZW5kKHt9LCBwYXJzZXJPYmouZGF0YSB8fCB7fSwgZGF0YSk7XG5cbiAgICAgICAgaWYgKHBhcnNlck9iai5wYXJzZXIgaW5zdGFuY2VvZiBJZkRpcmVjdGl2ZVBhcnNlcikge1xuICAgICAgICAgICAgdmFyIGJyYW5jaEluZGV4ID0gcGFyc2VyT2JqLnBhcnNlci5zZXREYXRhKHBhcnNlck9iai5kYXRhKTtcbiAgICAgICAgICAgIHZhciBicmFuY2hlcyA9IHBhcnNlck9iai5jaGlsZHJlbjtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwLCBqbCA9IGJyYW5jaGVzLmxlbmd0aDsgaiA8IGpsOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaiA9PT0gYnJhbmNoSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgd2Fsa1BhcnNlcnModHJlZSwgYnJhbmNoZXNbal0sIHBhcnNlck9iai5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgeiA9IDAsIHpsID0gYnJhbmNoZXNbal0ubGVuZ3RoOyB6IDwgemw7IHorKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYnJhbmNoZXNbal1bel0ucGFyc2VyIGluc3RhbmNlb2YgRXhwclBhcnNlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJhbmNoZXNbal1bel0ucGFyc2VyLmdvRGFyaygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKHBhcnNlck9iai5wYXJzZXIgaW5zdGFuY2VvZiBFeHByUGFyc2VyKSB7XG4gICAgICAgICAgICAgICAgcGFyc2VyT2JqLnBhcnNlci5yZXN0b3JlRnJvbURhcmsoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhcnNlck9iai5wYXJzZXIuc2V0RGF0YShwYXJzZXJPYmouZGF0YSk7XG4gICAgICAgICAgICBpZiAocGFyc2VyT2JqLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgd2Fsa1BhcnNlcnModHJlZSwgcGFyc2VyT2JqLmNoaWxkcmVuLCBwYXJzZXJPYmouZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHdhbGsodHJlZSwgc3RhcnROb2RlLCBlbmROb2RlLCBjb250YWluZXIpIHtcbiAgICB2YXIgY3VyTm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICBkbyB7XG4gICAgICAgIGlmICghY3VyTm9kZSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoSWZEaXJlY3RpdmVQYXJzZXIuaXNJZk5vZGUoY3VyTm9kZSwgdHJlZS5jb25maWcpKSB7XG4gICAgICAgICAgICB2YXIgaWZFbmROb2RlID0gSWZEaXJlY3RpdmVQYXJzZXIuZmluZElmRW5kKGN1ck5vZGUsIHRyZWUuY29uZmlnKTtcbiAgICAgICAgICAgIGlmICghaWZFbmROb2RlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd0aGUgaWYgZGlyZWN0aXZlIGlzIG5vdCBwcm9wZXJseSBlbmRlZCEnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGlmRGlyZWN0aXZlUGFyc2VyID0gbmV3IElmRGlyZWN0aXZlUGFyc2VyKHtcbiAgICAgICAgICAgICAgICBzdGFydE5vZGU6IGN1ck5vZGUsXG4gICAgICAgICAgICAgICAgZW5kTm9kZTogaWZFbmROb2RlLFxuICAgICAgICAgICAgICAgIGNvbmZpZzogdHJlZS5jb25maWcsXG4gICAgICAgICAgICAgICAgZXhwckNhbGN1bGF0ZXI6IHRyZWUuZXhwckNhbGN1bGF0ZXJcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgYnJhbmNoZXMgPSBpZkRpcmVjdGl2ZVBhcnNlci5jb2xsZWN0RXhwcnMoKTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5wdXNoKHtwYXJzZXI6IGlmRGlyZWN0aXZlUGFyc2VyLCBjaGlsZHJlbjogYnJhbmNoZXN9KTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGJyYW5jaGVzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoIWJyYW5jaGVzW2ldLnN0YXJ0Tm9kZSB8fCAhYnJhbmNoZXNbaV0uZW5kTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgaWZDb24gPSBbXTtcbiAgICAgICAgICAgICAgICB3YWxrKHRyZWUsIGJyYW5jaGVzW2ldLnN0YXJ0Tm9kZSwgYnJhbmNoZXNbaV0uZW5kTm9kZSwgaWZDb24pO1xuICAgICAgICAgICAgICAgIGJyYW5jaGVzW2ldID0gaWZDb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGN1ck5vZGUgPSBpZkVuZE5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChGb3JEaXJlY3RpdmVQYXJzZXIuaXNGb3JOb2RlKGN1ck5vZGUsIHRyZWUuY29uZmlnKSkge1xuICAgICAgICAgICAgdmFyIGZvckVuZE5vZGUgPSBGb3JEaXJlY3RpdmVQYXJzZXIuZmluZEZvckVuZChjdXJOb2RlLCB0cmVlLmNvbmZpZyk7XG4gICAgICAgICAgICBpZiAoIWZvckVuZE5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RoZSBmb3IgZGlyZWN0aXZlIGlzIG5vdCBwcm9wZXJseSBlbmRlZCEnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGZvckRpcmVjdGl2ZVBhcnNlciA9IG5ldyBGb3JEaXJlY3RpdmVQYXJzZXIoe1xuICAgICAgICAgICAgICAgIHN0YXJ0Tm9kZTogY3VyTm9kZSxcbiAgICAgICAgICAgICAgICBlbmROb2RlOiBmb3JFbmROb2RlLFxuICAgICAgICAgICAgICAgIGNvbmZpZzogdHJlZS5jb25maWcsXG4gICAgICAgICAgICAgICAgVHJlZTogVHJlZSxcbiAgICAgICAgICAgICAgICBleHByQ2FsY3VsYXRlcjogdHJlZS5leHByQ2FsY3VsYXRlclxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGZvckRpcmVjdGl2ZVBhcnNlci5jb2xsZWN0RXhwcnMoKTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5wdXNoKHtwYXJzZXI6IGZvckRpcmVjdGl2ZVBhcnNlcn0pO1xuXG4gICAgICAgICAgICBjdXJOb2RlID0gZm9yRW5kTm9kZS5uZXh0U2libGluZztcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGV4cHJQYXJzZXIgPSBuZXcgRXhwclBhcnNlcih7XG4gICAgICAgICAgICAgICAgbm9kZTogY3VyTm9kZSxcbiAgICAgICAgICAgICAgICBjb25maWc6IHRyZWUuY29uZmlnLFxuICAgICAgICAgICAgICAgIGV4cHJDYWxjdWxhdGVyOiB0cmVlLmV4cHJDYWxjdWxhdGVyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGV4cHJQYXJzZXIuY29sbGVjdEV4cHJzKCk7XG5cbiAgICAgICAgICAgIHZhciBjb24gPSBbXTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5wdXNoKHtwYXJzZXI6IGV4cHJQYXJzZXIsIGNoaWxkcmVuOiBjb259KTtcbiAgICAgICAgICAgIGlmIChjdXJOb2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgICAgICAgICAgd2Fsayh0cmVlLCBjdXJOb2RlLmZpcnN0Q2hpbGQsIGN1ck5vZGUubGFzdENoaWxkLCBjb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY3VyTm9kZSA9IGN1ck5vZGUubmV4dFNpYmxpbmc7XG4gICAgfSB3aGlsZSAoY3VyTm9kZSAhPT0gZW5kTm9kZSk7XG59XG5cblxuXG4iLCIvKipcbiAqIEBmaWxlIOe7p+aJv1xuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbmZ1bmN0aW9uIGluaGVyaXQoQ2hpbGRDbGFzcywgUGFyZW50Q2xhc3MpIHtcbiAgICB2YXIgY2hpbGRQcm90byA9IENoaWxkQ2xhc3MucHJvdG90eXBlO1xuICAgIENoaWxkQ2xhc3MucHJvdG90eXBlID0gbmV3IFBhcmVudENsYXNzKHt9KTtcbiAgICBmb3IgKHZhciBrZXkgaW4gY2hpbGRQcm90bykge1xuICAgICAgICBpZiAoY2hpbGRQcm90by5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBDaGlsZENsYXNzLnByb3RvdHlwZVtrZXldID0gY2hpbGRQcm90b1trZXldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBDaGlsZENsYXNzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluaGVyaXQ7XG5cbi8vIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7XG4vLyAgICAgdmFyIEVtcHR5ID0gZnVuY3Rpb24gKCkge307XG4vLyAgICAgRW1wdHkucHJvdG90eXBlID0gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG4vLyAgICAgdmFyIHNlbGZQcm90b3R5cGUgPSBzdWJDbGFzcy5wcm90b3R5cGU7XG4vLyAgICAgdmFyIHByb3RvID0gc3ViQ2xhc3MucHJvdG90eXBlID0gbmV3IEVtcHR5KCk7XG5cbi8vICAgICBmb3IgKHZhciBrZXkgaW4gc2VsZlByb3RvdHlwZSkge1xuLy8gICAgICAgICBwcm90b1trZXldID0gc2VsZlByb3RvdHlwZVtrZXldO1xuLy8gICAgIH1cbi8vICAgICBzdWJDbGFzcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBzdWJDbGFzcztcbi8vICAgICBzdWJDbGFzcy5zdXBlckNsYXNzID0gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG5cbi8vICAgICByZXR1cm4gc3ViQ2xhc3M7XG4vLyB9O1xuIiwiLyoqXG4gKiBAZmlsZSDkuIDloIbpobnnm67ph4zpnaLluLjnlKjnmoTmlrnms5VcbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG5leHBvcnRzLnNsaWNlID0gZnVuY3Rpb24gKGFyciwgc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnIsIHN0YXJ0LCBlbmQpO1xufTtcblxuZXhwb3J0cy5nb0RhcmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBub2RlLl9fdGV4dF9fID0gbm9kZS5ub2RlVmFsdWU7XG4gICAgICAgIG5vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgfVxufTtcblxuZXhwb3J0cy5yZXN0b3JlRnJvbURhcmsgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgaWYgKG5vZGUuX190ZXh0X18gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbm9kZS5ub2RlVmFsdWUgPSBub2RlLl9fdGV4dF9fO1xuICAgICAgICAgICAgbm9kZS5fX3RleHRfXyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmV4cG9ydHMuY3JlYXRlRXhwckZuID0gZnVuY3Rpb24gKGV4cHJSZWdFeHAsIGV4cHIsIGV4cHJDYWxjdWxhdGVyKSB7XG4gICAgZXhwciA9IGV4cHIucmVwbGFjZShleHByUmVnRXhwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBhcmd1bWVudHNbMV07XG4gICAgfSk7XG4gICAgZXhwckNhbGN1bGF0ZXIuY3JlYXRlRXhwckZuKGV4cHIpO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJldHVybiBleHByQ2FsY3VsYXRlci5jYWxjdWxhdGUoZXhwciwgZmFsc2UsIGRhdGEpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIOi2hee6p+eugOWNleeahCBleHRlbmQg77yM5Zug5Li65pys5bqT5a+5IGV4dGVuZCDmsqHpgqPpq5jnmoTopoHmsYLvvIxcbiAqIOetieWIsOacieimgeaxgueahOaXtuWAmeWGjeWujOWWhOOAglxuICpcbiAqIEBpbm5lclxuICogQHBhcmFtICB7T2JqZWN0fSB0YXJnZXQg55uu5qCH5a+56LGhXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICDmnIDnu4jlkIjlubblkI7nmoTlr7nosaFcbiAqL1xuZXhwb3J0cy5leHRlbmQgPSBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gICAgdmFyIHNyY3MgPSBleHBvcnRzLnNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gc3Jjcy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG4gICAgICAgIC8qIGVzbGludC1kaXNhYmxlIGd1YXJkLWZvci1pbiAqL1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3Jjc1tpXSkge1xuICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzcmNzW2ldW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgLyogZXNsaW50LWVuYWJsZSBndWFyZC1mb3ItaW4gKi9cbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn07XG5cbmV4cG9ydHMudHJhdmVyc2VOb0NoYW5nZU5vZGVzID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgbm9kZUZuLCBjb250ZXh0KSB7XG4gICAgZm9yICh2YXIgY3VyTm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICAgICAgY3VyTm9kZSAmJiBjdXJOb2RlICE9PSBlbmROb2RlO1xuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZ1xuICAgICkge1xuICAgICAgICBpZiAobm9kZUZuLmNhbGwoY29udGV4dCwgY3VyTm9kZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5vZGVGbi5jYWxsKGNvbnRleHQsIGVuZE5vZGUpO1xufTtcblxuZXhwb3J0cy50cmF2ZXJzZU5vZGVzID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSwgZW5kTm9kZSwgbm9kZUZuLCBjb250ZXh0KSB7XG4gICAgdmFyIG5vZGVzID0gW107XG4gICAgZm9yICh2YXIgY3VyTm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICAgICAgY3VyTm9kZSAmJiBjdXJOb2RlICE9PSBlbmROb2RlO1xuICAgICAgICBjdXJOb2RlID0gY3VyTm9kZS5uZXh0U2libGluZ1xuICAgICkge1xuICAgICAgICBub2Rlcy5wdXNoKGN1ck5vZGUpO1xuICAgIH1cblxuICAgIG5vZGVzLnB1c2goZW5kTm9kZSk7XG5cbiAgICBleHBvcnRzLmVhY2gobm9kZXMsIG5vZGVGbiwgY29udGV4dCk7XG59O1xuXG5leHBvcnRzLmVhY2ggPSBmdW5jdGlvbiAoYXJyLCBmbiwgY29udGV4dCkge1xuICAgIGlmIChleHBvcnRzLmlzQXJyYXkoYXJyKSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBhcnIubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuICAgICAgICAgICAgaWYgKGZuLmNhbGwoY29udGV4dCwgYXJyW2ldLCBpLCBhcnIpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGFyciA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBhcnIpIHtcbiAgICAgICAgICAgIGlmIChmbi5jYWxsKGNvbnRleHQsIGFycltrXSwgaywgYXJyKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0cy5pc0FycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PT0gJ29iamVjdCBBcnJheSc7XG59O1xuIiwid2luZG93LlRyZWUgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4uL3NyYy9UcmVlLmpzJyk7Il19
