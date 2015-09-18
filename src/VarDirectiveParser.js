/**
 * @file 变量定义指令解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');
var inherit = require('./inherit');
var Tree = require('./Tree');

function VarDirectiveParser(options) {
    Parser.call(this, options);

    this.node = options.node;
}

VarDirectiveParser.prototype.collectExprs = function () {
    var expr = this.node.nodeValue.replace(this.config.varName + ':', '');
    this.exprCalculater.createExprFn(expr);

    var leftValueName = expr.match(/\s*.+(?=\=)/)[0].replace(/\s+/g, '');

    var me = this;
    this.exprFn = function (scopeModel) {
        scopeModel.set(leftValueName, me.exprCalculater.calculate(expr, false, scopeModel));
    };
};

VarDirectiveParser.prototype.setData = function (scopeModel) {
    Parser.prototype.setData.apply(this, arguments);
    this.exprFn(scopeModel);
};

VarDirectiveParser.isProperNode = function (node, config) {
    return node.nodeType === 8
        && node.nodeValue.replace(/^\s+/, '').indexOf(config.varName + ':') === 0;
};


module.exports = inherit(VarDirectiveParser, Parser);
Tree.registeParser(VarDirectiveParser);
