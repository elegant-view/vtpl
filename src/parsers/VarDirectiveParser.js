/**
 * @file 变量定义指令解析器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';
import DoneChecker from '../DoneChecker';
import * as utils from '../utils';

const EXPRESSION = Symbol('expression');
const LEFT_VALUE_NAME = Symbol('leftValueName');

/**
 * 匹配var中表达式
 *
 * @type {RegExp}
 */
const VAR_EXPRESSION_REG = /var:\s*([\w\$]+)\s*=/;

export default class VarDirectiveParser extends DirectiveParser {

    static priority = 2;

    constructor(options) {
        super(options);

        this[EXPRESSION] = null;
        this[LEFT_VALUE_NAME] = null;
        this.expressions = [];
    }

    collectExprs() {
        const nodeValue = (this.startNode.getNodeValue() || '').replace(/\n/g, ' ');
        this[EXPRESSION] = this.wrapRawExpression(nodeValue.slice(nodeValue.indexOf('=', 0) + 1));

        const exprWatcher = this.getExpressionWatcher();
        exprWatcher.addExpr(this[EXPRESSION]);
        this.expressions.push(this[EXPRESSION]);

        try {
            this[LEFT_VALUE_NAME] = nodeValue.match(VAR_EXPRESSION_REG)[1];
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

    static isProperNode(node) {
        const nodeValue = node.getNodeValue();
        return DirectiveParser.isProperNode(node)
            && utils.trim(nodeValue).indexOf('var:') === 0;
    }
}
