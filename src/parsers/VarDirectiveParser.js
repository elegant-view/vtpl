/**
 * @file 变量定义指令解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';

const EXPRESSION = Symbol('expression');
const LEFT_VALUE_NAME = Symbol('leftValueName');

export default class VarDirectiveParser extends DirectiveParser {
    constructor(options) {
        super(options);

        this[EXPRESSION] = null;
        this[LEFT_VALUE_NAME] = null;
    }

    collectExprs() {
        let nodeValue = this.startNode.getNodeValue();

        this[EXPRESSION] = `$\{${nodeValue.slice(nodeValue.indexOf('=', 0) + 1)}}`;

        let exprWatcher = this.getExpressionWatcher();
        exprWatcher.addExpr(this[EXPRESSION]);

        try {
            this[LEFT_VALUE_NAME] = nodeValue.match(/var:\s*([\w\$]+)=/)[1];
        }
        catch (e) {
            throw new Error(`wrong var expression ${this[LEFT_VALUE_NAME]}`);
        }
    }

    linkScope() {
        let exprWatcher = this.getExpressionWatcher();
        exprWatcher.on('change', event => {
            if (!this.isDark && event.expr === this[EXPRESSION]) {
                this.getScope().set(this[LEFT_VALUE_NAME], exprWatcher.calculate(this[EXPRESSION]));
            }
        });
    }

    initRender() {
        const exprWatcher = this.getExpressionWatcher();
        this.getScope().set(this[LEFT_VALUE_NAME], exprWatcher.calculate(this[EXPRESSION]));
    }

    destroy() {
        this[EXPRESSION] = null;
        this[LEFT_VALUE_NAME] = null;
        super.destroy();
    }

    static isProperNode(node, config) {
        const nodeValue = node.getNodeValue();
        return DirectiveParser.isProperNode(node)
            && nodeValue.replace(/^\s+/, '').indexOf(config.varName + ':') === 0;
    }
}
