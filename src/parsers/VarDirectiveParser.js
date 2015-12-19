/**
 * @file 变量定义指令解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var DirectiveParser = require('./DirectiveParser');
var Tree = require('../trees/Tree');

var VarDirectiveParser = DirectiveParser.extends(
    {
        initialize: function (options) {
            DirectiveParser.prototype.initialize.apply(this, arguments);

            this.node = options.node;
        },

        collectExprs: function () {
            var nodeValue = this.node.getNodeValue();
            var config = this.tree.getTreeVar('config');
            var expr = nodeValue.replace(config.varName + ':', '');

            var exprCalculater = this.tree.getTreeVar('exprCalculater');
            exprCalculater.createExprFn(expr);

            var leftValueName = expr.match(/\s*.+(?=\=)/)[0].replace(/\s+/g, '');

            this.exprFn = function (scopeModel) {
                var oldValue = scopeModel.get(leftValueName);
                var newValue = exprCalculater.calculate(expr, false, scopeModel);
                if (oldValue !== newValue) {
                    scopeModel.set(leftValueName, newValue);
                }
            };
        },

        linkScope: function () {
            DirectiveParser.prototype.linkScope.apply(this, arguments);
            this.exprFn(this.tree.rootScope);
        },

        /**
         * 获取开始节点
         *
         * @protected
         * @inheritDoc
         * @return {Node}
         */
        getStartNode: function () {
            return this.node;
        },

        /**
         * 获取结束节点
         *
         * @protected
         * @inheritDoc
         * @return {Node}
         */
        getEndNode: function () {
            return this.node;
        }
    },
    {
        isProperNode: function (node, config) {
            var nodeValue = node.getNodeValue();
            return DirectiveParser.isProperNode(node)
                && nodeValue.replace(/^\s+/, '').indexOf(config.varName + ':') === 0;
        },

        $name: 'VarDirectiveParser'
    }
);

module.exports = VarDirectiveParser;
Tree.registeParser(module.exports);

