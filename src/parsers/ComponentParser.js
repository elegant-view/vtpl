/**
 * @file 组件解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var inherit = require('../inherit');
var Parser = require('./Parser');
var Tree = require('../trees/Tree');
var ComponentManager = require('../ComponentManager');
var utils = require('../utils');

function ComponentParser(options) {
    Parser.call(this, options);
}

ComponentParser.prototype.initialize = function (options) {
    Parser.prototype.initialize.apply(this, arguments);

    var componentManager = this.tree.getTreeVar('componentManager');
    if (!componentManager) {
        componentManager = new ComponentManager();
        this.tree.setTreeVar('componentManager', componentManager);
    }

    this.node = options.node;

    this.exprs = [];
    this.exprFns = {};
    this.updateFns = {};
    this.exprOldValues = {};
};

ComponentParser.prototype.collectExprs = function () {
    var curNode = this.node;

    var attributes = curNode.attributes;
    this.setLiteralAttrsFns = [];
    for (var i = 0, il = attributes.length; i < il; i++) {
        var attr = attributes[i];
        var expr = attr.nodeValue;
        if (this.config.getExprRegExp().test(expr)) {
            this.exprs.push(expr);
            if (!this.exprFns[expr]) {
                var rawExpr = expr.replace(this.config.getExprRegExp(), function () {
                    return arguments[1];
                });
                this.exprCalculater.createExprFn(rawExpr);
                this.exprFns[expr] = utils.bind(function (rawExpr, exprCalculater, scopeModel) {
                    return exprCalculater.calculate(rawExpr, false, scopeModel);
                }, null, rawExpr, this.exprCalculater);

                this.updateFns[expr] = this.updateFns[expr] || [];
                this.updateFns[expr].push(utils.bind(function (name, exprValue, component) {
                    component.setAttr(name, exprValue);
                }, null, attr.nodeName));
            }
        }
        else {
            this.setLiteralAttrsFns.push(utils.bind(function (attr, component) {
                component.setAttr(attr.nodeName, attr.nodeValue);
            }, null, attr));
        }
    }
    return true;
};

ComponentParser.prototype.setScope = function (scopeModel) {
    Parser.prototype.setScope.apply(this, arguments);

    var componentName = this.node.tagName.toLowerCase().replace('ui', '')
        .replace(/-[a-z]/g, function () {
            return arguments[0][1].toUpperCase();
        });

    var componentManager = this.tree.getTreeVar('componentManager');
    var ComponentClass = componentManager.getClass(componentName);
    if (!ComponentClass) {
        throw new Error('the component `' + componentName + '` is not registed!');
    }

    this.component = new ComponentClass({
        componentNode: this.node,
        treeOptions: {
            exprCalculater: this.tree.exprCalculater,
            domUpdater: this.tree.domUpdater,
            config: this.tree.config,
            treeVars: this.tree.treeVars
        },
        outScope: this.scopeModel
    });

    for (var i = 0, il = this.setLiteralAttrsFns.length; i < il; i++) {
        this.setLiteralAttrsFns[i](this.component);
    }

    var me = this;
    this.component.getTpl(function () {
        me.component.mount();
    });
};

ComponentParser.prototype.onChange = function () {
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
                updateFns[j](exprValue, this.component);
            }
        }

        exprOldValues[expr] = exprValue;
    }

    Parser.prototype.onChange.apply(this, arguments);
};

ComponentParser.prototype.goDark = function () {
    this.component.goDark();
    this.isGoDark = true;
};

ComponentParser.prototype.restoreFromDark = function () {
    this.component.restoreFromDark();
    this.isGoDark = false;
};

ComponentParser.isProperNode = function (node, config) {
    return node.nodeType === 1 && node.tagName.toLowerCase().indexOf('ui-') === 0;
};

module.exports = inherit(ComponentParser, Parser);
Tree.registeParser(ComponentParser);

function getClass(instance) {
    return instance.constructor;
}
