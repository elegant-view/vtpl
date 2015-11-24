/**
 * @file 表达式解析器，一个文本节点或者元素节点对应一个表达式解析器实例
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');
var inherit = require('../inherit');
var utils = require('../utils');
var Tree = require('../trees/Tree');
var DomUpdater = require('../DomUpdater');

function ExprParser(options) {
    Parser.call(this, options);
}

ExprParser.prototype.initialize = function (options) {
    Parser.prototype.initialize.apply(this, arguments);

    this.node = options.node;

    this.exprs = [];
    this.exprFns = {};
    this.updateFns = {};
    this.restoreFns = {}; // 恢复原貌的函数
    this.exprOldValues = {};
};

/**
 * 搜集过程
 *
 * @public
 * @return {boolean} 返回布尔值
 */
ExprParser.prototype.collectExprs = function () {
    var curNode = this.node;

    // 文本节点
    if (curNode.nodeType === 3) {
        this.addExpr();
        return true;
    }

    // 元素节点
    if (curNode.nodeType === 1) {
        var attributes = curNode.attributes;
        for (var i = 0, il = attributes.length; i < il; i++) {
            this.addExpr(attributes[i]);
        }
        return true;
    }

    return false;
};

/**
 * 添加表达式
 *
 * @protected
 * @param {Attr} attr 如果当前是元素节点，则要传入遍历到的属性，所以attr存在与否是判断当前元素是否是文本节点的一个依据
 */
ExprParser.prototype.addExpr = function (attr) {
    var expr = attr ? attr.value : this.node.nodeValue;
    if (!this.config.getExprRegExp().test(expr)) {
        return;
    }
    addExpr(
        this,
        expr,
        attr ? createAttrUpdateFn(this.node, attr.name, this.domUpdater) : (function (me, curNode) {
            var taskId = me.domUpdater.generateTaskId();
            return function (exprValue) {
                me.domUpdater.addTaskFn(
                    taskId,
                    utils.bind(function (curNode, exprValue) {
                        curNode.nodeValue = exprValue;
                    }, null, curNode, exprValue)
                );
            };
        })(this, this.node)
    );

    this.restoreFns[expr] = this.restoreFns[expr] || [];
    if (attr) {
        this.restoreFns[expr].push(utils.bind(function (curNode, attrName, attrValue) {
            curNode.setAttribute(attrName, attrValue);
        }, null, this.node, attr.name, attr.value));
    }
    else {
        this.restoreFns[expr].push(utils.bind(function (curNode, nodeValue) {
            curNode.nodeValue = nodeValue;
        }, null, this.node, this.node.nodeValue));
    }
};

/**
 * 获取开始节点
 *
 * @protected
 * @inheritDoc
 * @return {Node}
 */
ExprParser.prototype.getStartNode = function () {
    return this.node;
};

/**
 * 获取结束节点
 *
 * @protected
 * @inheritDoc
 * @return {Node}
 */
ExprParser.prototype.getEndNode = function () {
    return this.node;
};

ExprParser.prototype.destroy = function () {
    utils.each(this.exprs, function (expr) {
        utils.each(this.restoreFns[expr], function (restoreFn) {
            restoreFn();
        }, this);
    }, this);

    this.node = null;
    this.exprs = null;
    this.exprFns = null;
    this.updateFns = null;
    this.exprOldValues = null;
    this.restoreFns = null;

    Parser.prototype.destroy.call(this);
};

/**
 * 节点“隐藏”起来
 *
 * @public
 */
ExprParser.prototype.goDark = function () {
    utils.goDark(this.node);
    this.isGoDark = true;
};

ExprParser.prototype.onChange = function () {
    if (this.isGoDark) {
        return;
    }

    var exprs = this.exprs;
    var exprOldValues = this.exprOldValues;
    for (var i = 0, il = exprs.length; i < il; i++) {
        var expr = exprs[i];
        var exprValue = this.exprFns[expr](this.scopeModel);

        if (this.dirtyCheck(expr, exprValue, exprOldValues[expr])) {
            var updateFns = this.updateFns[expr];
            for (var j = 0, jl = updateFns.length; j < jl; j++) {
                updateFns[j](exprValue);
            }
        }

        exprOldValues[expr] = exprValue;
    }

    Parser.prototype.onChange.apply(this, arguments);
};

/**
 * 节点“显示”出来
 *
 * @public
 */
ExprParser.prototype.restoreFromDark = function () {
    utils.restoreFromDark(this.node);
    this.isGoDark = false;
};

ExprParser.isProperNode = function (node) {
    return node.nodeType === 1 || node.nodeType === 3;
};

module.exports = inherit(ExprParser, Parser);
Tree.registeParser(module.exports);

/**
 * 创建DOM节点属性更新函数
 *
 * @inner
 * @param  {Node} node    DOM中的节点
 * @param {string} name 要更新的属性名
 * @param  {DomUpdater} domUpdater DOM更新器
 * @return {function(Object)}      更新函数
 */
function createAttrUpdateFn(node, name, domUpdater) {
    var taskId = domUpdater.generateTaskId();
    return function (exprValue) {
        domUpdater.addTaskFn(
            taskId,
            utils.bind(function (node, name, exprValue) {
                DomUpdater.setAttr(node, name, exprValue);
            }, null, node, name, exprValue)
        );
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

/**
 * 创建根据scopeModel计算表达式值的函数
 *
 * @inner
 * @param  {Parser} parser 解析器实例
 * @param  {string} expr   含有表达式的字符串
 * @return {function(Scope):*}
 */
function createExprFn(parser, expr) {
    return function (scopeModel) {
        // 此处要分两种情况：
        // 1、expr并不是纯正的表达式，如`==${name}==`。
        // 2、expr是纯正的表达式，如`${name}`。
        // 对于不纯正表达式的情况，此处的返回值肯定是字符串；
        // 而对于纯正的表达式，此处就不要将其转换成字符串形式了。

        var regExp = parser.config.getExprRegExp();

        var possibleExprCount = expr.match(new RegExp(utils.regExpEncode(parser.config.exprPrefix), 'g'));
        possibleExprCount = possibleExprCount ? possibleExprCount.length : 0;

        // 不纯正
        if (possibleExprCount !== 1 || expr.replace(regExp, '')) {
            return expr.replace(regExp, function () {
                parser.exprCalculater.createExprFn(arguments[1]);
                return parser.exprCalculater.calculate(arguments[1], false, scopeModel);
            });
        }

        // 纯正
        var pureExpr = expr.slice(parser.config.exprPrefix.length, -parser.config.exprSuffix.length);
        parser.exprCalculater.createExprFn(pureExpr);
        return parser.exprCalculater.calculate(pureExpr, false, scopeModel);
    };
}
