/**
 * @file 变量定义指令解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var DirectiveParser = require('./DirectiveParser');
var inherit = require('../inherit');
var Tree = require('../trees/Tree');

function VarDirectiveParser(options) {
    DirectiveParser.call(this, options);

    this.node = options.node;
}

VarDirectiveParser.prototype.collectExprs = function () {
    var expr = this.node.nodeValue.replace(this.config.varName + ':', '');
    this.exprCalculater.createExprFn(expr);

    var leftValueName = expr.match(/\s*.+(?=\=)/)[0].replace(/\s+/g, '');

    var me = this;
    this.exprFn = function (scopeModel) {
        var oldValue = scopeModel.get(leftValueName);
        var newValue = me.exprCalculater.calculate(expr, false, scopeModel);
        if (oldValue !== newValue) {
            scopeModel.set(leftValueName, newValue);
        }
    };
};

VarDirectiveParser.prototype.setScope = function (scopeModel) {
    DirectiveParser.prototype.setScope.apply(this, arguments);
    this.exprFn(this.scopeModel);
};

/**
 * 获取开始节点
 *
 * @protected
 * @inheritDoc
 * @return {Node}
 */
VarDirectiveParser.prototype.getStartNode = function () {
    return this.node;
};

/**
 * 获取结束节点
 *
 * @protected
 * @inheritDoc
 * @return {Node}
 */
VarDirectiveParser.prototype.getEndNode = function () {
    return this.node;
};

VarDirectiveParser.isProperNode = function (node, config) {
    return node.nodeType === 8
        && node.nodeValue.replace(/^\s+/, '').indexOf(config.varName + ':') === 0;
};


module.exports = inherit(VarDirectiveParser, DirectiveParser);
Tree.registeParser(VarDirectiveParser);

