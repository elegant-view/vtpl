/**
 * @file 变量定义指令解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';
import DoneChecker from '../DoneChecker';

const EXPRESSION = Symbol('expression');
const LEFT_VALUE_NAME = Symbol('leftValueName');

export default class VarDirectiveParser extends DirectiveParser {
    constructor(options) {
        super(options);

        this[EXPRESSION] = null;
        this[LEFT_VALUE_NAME] = null;
    }

    collectExprs() {
        const nodeValue = this.startNode.getNodeValue();
        this[EXPRESSION] = `$\{${nodeValue.slice(nodeValue.indexOf('=', 0) + 1)}}`;

        const exprWatcher = this.getExpressionWatcher();
        exprWatcher.addExpr(this[EXPRESSION]);

        try {
            this[LEFT_VALUE_NAME] = nodeValue.match(/var:\s*([\w\$]+)=/)[1];
        }
        catch (e) {
            throw new Error(`wrong var expression ${this[LEFT_VALUE_NAME]}`);
        }
    }

    linkScope() {
        const exprWatcher = this.getExpressionWatcher();
        exprWatcher.on('change', (event, done) => {
            const doneChecker = new DoneChecker(done);
            if (!this.isDark && event.expr === this[EXPRESSION]) {
                doneChecker.add(done => {
                    this.getScope().set(this[LEFT_VALUE_NAME], exprWatcher.calculate(this[EXPRESSION]), done);
                });
            }
            doneChecker.complete();
        });
    }

    initRender(done) {
        const exprWatcher = this.getExpressionWatcher();
        this.getScope().set(this[LEFT_VALUE_NAME], exprWatcher.calculate(this[EXPRESSION]), false, done);
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
