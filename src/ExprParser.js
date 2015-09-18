/**
 * @file 表达式解析器，一个文本节点或者元素节点对应一个表达式解析器实例
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');
var inherit = require('./inherit');
var utils = require('./utils');
var Tree = require('./Tree');

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
        attr ? createAttrUpdateFn(attr, this.domUpdater) : (function (me, curNode) {
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
 * 设置数据过程
 *
 * @public
 * @param {ScopeModel} scopeModel 数据
 */
ExprParser.prototype.setData = function (scopeModel) {
    Parser.prototype.setData.apply(this, arguments);

    var exprs = this.exprs;
    var exprOldValues = this.exprOldValues;
    for (var i = 0, il = exprs.length; i < il; i++) {
        var expr = exprs[i];
        var exprValue = this.exprFns[expr](scopeModel);

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

ExprParser.isProperNode = function (node) {
    return node.nodeType === 1 || node.nodeType === 3;
};

module.exports = inherit(ExprParser, Parser);
Tree.registeParser(module.exports);

function createAttrUpdateFn(attr, domUpdater) {
    var taskId = domUpdater.generateTaskId();
    return function (exprValue) {
        domUpdater.addTaskFn(
            taskId,
            utils.bind(function (attr, exprValue) {
                attr.value = exprValue;
            }, null, attr, exprValue)
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

function createExprFn(parser, expr) {
    return function (scopeModel) {
        return expr.replace(parser.config.getExprRegExp(), function () {
            parser.exprCalculater.createExprFn(arguments[1]);
            return parser.exprCalculater.calculate(arguments[1], false, scopeModel);
        });
    };
}
