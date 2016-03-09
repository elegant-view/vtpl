/**
 * @file 变量定义指令解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';

class VarDirectiveParser extends DirectiveParser {
    constructor(options) {
        super(options);

        this.node = options.node;
        this.updateFn = null;

        this.$$expr = null;
        this.$$leftValueName = null;
    }

    collectExprs() {
        let nodeValue = this.node.getNodeValue();

        this.$$expr = '${' + nodeValue.slice(nodeValue.indexOf('=', 0) + 1) + '}';

        let exprWatcher = this.tree.getExprWatcher();
        exprWatcher.addExpr(this.$$expr);

        try {
            this.$$leftValueName = nodeValue.match(/var:\s*([\w\$]+)=/)[1];
        }
        catch (e) {
            throw new Error(`wrong var expression ${this.$$leftValueName}`);
        }
    }

    linkScope() {
        let exprWatcher = this.tree.getExprWatcher();
        exprWatcher.on('change', event => {
            if (!this.isGoDark && event.expr === this.$$expr) {
                this.tree.rootScope.set(this.$$leftValueName, exprWatcher.calculate(this.$$expr));
            }
        });
    }

    initRender() {
        debugger
        let exprWatcher = this.tree.getExprWatcher();
        this.tree.rootScope.set(this.$$leftValueName, exprWatcher.calculate(this.$$expr));
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

export default VarDirectiveParser;
