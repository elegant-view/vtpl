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
        this.expressions = [];
    }

    collectExprs() {
        let nodeValue = this.startNode.getNodeValue() || '';
        // 去掉换行
        nodeValue = nodeValue.replace(/\n/g, '');
        this[EXPRESSION] = `$\{${nodeValue.slice(nodeValue.indexOf('=', 0) + 1)}}`;

        const exprWatcher = this.getExpressionWatcher();
        exprWatcher.addExpr(this[EXPRESSION]);
        this.expressions.push(this[EXPRESSION]);

        try {
            this[LEFT_VALUE_NAME] = nodeValue.match(/var:\s*([\w\$]+)\s*=/)[1];
        }
        catch (e) {
            throw new Error(`wrong var expression ${this[LEFT_VALUE_NAME]}`);
        }
    }


    onExpressionChange(event, done) {
        const exprWatcher = this.getExpressionWatcher();
        const doneChecker = new DoneChecker(done);
        if (!this.isDark && event.expr === this[EXPRESSION]) {
            doneChecker.add(done => {
                const exprVal = exprWatcher.calculate(this[EXPRESSION]);
                this.getScope().set(this[LEFT_VALUE_NAME], exprVal, false, done);
            });
        }
        doneChecker.complete();
    }

    initRender(done) {
        const exprWatcher = this.getExpressionWatcher();
        this.getScope().set(this[LEFT_VALUE_NAME], exprWatcher.calculate(this[EXPRESSION]), false, done);
    }

    /**
     * 释放资源
     *
     * @override
     * @protected
     */
    release() {
        this[EXPRESSION] = null;
        this[LEFT_VALUE_NAME] = null;
        this.expressions = null;
        super.release();
    }

    static isProperNode(node, config) {
        const nodeValue = node.getNodeValue();
        return DirectiveParser.isProperNode(node)
            && nodeValue.replace(/^\s+/, '').indexOf(config.varName + ':') === 0;
    }
}
