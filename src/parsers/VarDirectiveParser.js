/**
 * @file 变量定义指令解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';
import Tree from '../trees/Tree';

const VarDirectiveParser = DirectiveParser.extends(
    {
        initialize(options) {
            DirectiveParser.prototype.initialize.apply(this, arguments);

            this.node = options.node;
        },

        collectExprs() {
            let nodeValue = this.node.getNodeValue();
            let config = this.tree.getTreeVar('config');
            let expr = nodeValue.replace(config.varName + ':', '');

            let exprCalculater = this.tree.getTreeVar('exprCalculater');
            exprCalculater.createExprFn(expr);

            let leftValueName = expr.match(/\s*.+(?=\=)/)[0].replace(/\s+/g, '');

            this.exprFn = function (scopeModel) {
                let oldValue = scopeModel.get(leftValueName);
                let newValue = exprCalculater.calculate(expr, false, scopeModel);
                if (oldValue !== newValue) {
                    scopeModel.set(leftValueName, newValue);
                }
            };
        },

        linkScope() {
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
        getStartNode() {
            return this.node;
        },

        /**
         * 获取结束节点
         *
         * @protected
         * @inheritDoc
         * @return {Node}
         */
        getEndNode() {
            return this.node;
        }
    },
    {
        isProperNode(node, config) {
            let nodeValue = node.getNodeValue();
            return DirectiveParser.isProperNode(node)
                && nodeValue.replace(/^\s+/, '').indexOf(config.varName + ':') === 0;
        },

        $name: 'VarDirectiveParser'
    }
);

Tree.registeParser(VarDirectiveParser);
export default VarDirectiveParser;

