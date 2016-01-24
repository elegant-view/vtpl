/**
 * @file 变量定义指令解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';
import Tree from '../trees/Tree';

class VarDirectiveParser extends DirectiveParser {
    constructor(options) {
        super(options);

        this.node = options.node;
        this.updateFn = null;
    }

    collectExprs() {
        let nodeValue = this.node.getNodeValue();
        let config = this.tree.getTreeVar('config');
        let expr = nodeValue.replace(config.varName + ':', '');

        let exprCalculater = this.tree.getTreeVar('exprCalculater');
        let {paramNames} = exprCalculater.createExprFn(expr, false);
        this.addParamName2ExprMap(paramNames, expr);

        let leftValueName = expr.match(/\s*.+(?=\=)/)[0].replace(/\s+/g, '');

        this.updateFn = function (scopeModel) {
            let oldValue = scopeModel.get(leftValueName);
            let newValue = exprCalculater.calculate(expr, false, scopeModel);
            if (oldValue !== newValue) {
                scopeModel.set(leftValueName, newValue);
            }
        };
    }

    linkScope() {
        this.renderToDom();
        this.listenToChange(this.tree.rootScope, event => this.renderToDom(event.changes));
    }

    renderToDom(changes) {
        if (this.isGoDark) {
            return;
        }

        if (!changes) {
            this.updateFn(this.tree.rootScope);
            return;
        }

        for (let i = 0, il = changes.length; i < il; ++i) {
            let exprs = this.getExprsByParamName(changes[i].name);
            if (exprs && exprs.length) {
                this.updateFn(this.tree.rootScope);
                return;
            }
        }
    }

    /**
     * 获取开始节点
     *
     * @protected
     * @inheritDoc
     * @return {Node}
     */
    getStartNode() {
        return this.node;
    }

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

    goDark() {
        this.isGoDark = true;
    }

    restoreFromDark() {
        this.isGoDark = false;
    }

    static isProperNode(node, config) {
        let nodeValue = node.getNodeValue();
        return DirectiveParser.isProperNode(node)
            && nodeValue.replace(/^\s+/, '').indexOf(config.varName + ':') === 0;
    }
}

Tree.registeParser(VarDirectiveParser);
export default VarDirectiveParser;

