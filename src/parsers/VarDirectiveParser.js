/**
 * @file 变量定义指令解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var DirectiveParser = require('./DirectiveParser');
var Tree = require('../trees/Tree');

module.exports = DirectiveParser.extends(
    {
        $name: 'VarDirectiveParser',
        initialize: function (options) {
            DirectiveParser.prototype.initialize.apply(this, arguments);

            this.node = options.node;
        },

        collectExprs: function () {
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
        },

        setScope: function (scopeModel) {
            DirectiveParser.prototype.setScope.apply(this, arguments);
            this.exprFn(this.scopeModel);
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
            return node.nodeType === 8
                && node.nodeValue.replace(/^\s+/, '').indexOf(config.varName + ':') === 0;
        }
    }
);

Tree.registeParser(module.exports);

