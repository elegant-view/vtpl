/**
 * @file if 指令。
 *       在实现中有个纠结点：如果if指令嵌套的话，外层if的branchTree不能直接向下广播change事件，但是branchTree又要能够拿到外层scope的数据。
 *       处理方式：
 *           renderDom方法用于将scopeModel中的变化反应到DOM中去，如果某个分支处于不该显示的状态，会有一个godark的标记。
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';
import Node from '../nodes/Node';
import Tree from '../trees/Tree';
import DoneChecker from '../DoneChecker';

const EXPRESSIONS = Symbol('expressions');
const BRANCH_TREES = Symbol('branchTrees');
const HAS_ELSE_BRANCH = Symbol('hasElseBranch');

/**
 * 匹配if开始指令的前缀
 *
 * @const
 * @type {RegExp}
 */
const IF_START_PREFIX_REG = /^\s*if:\s*/;

/**
 * elif前缀
 *
 * @const
 * @type {RegExp}
 */
const ELIF_PREFIX_REG = /^\s*elif:\s*/;

/**
 * else
 *
 * @const
 * @type {RegExp}
 */
const ELSE_REG = /^\s*else\s*/;

/**
 * if结束指令
 *
 * @const
 * @type {RegExp}
 */
const IF_END_REG = /^\s*\/if\s*/;

/**
 * if和elif中的表达式
 *
 * @const
 * @type {RegExp}
 */
const IF_ELIF_EXPRESSION_REG = /\s*(?:el)?if:\s*((.|\n)*\S)\s*$/;

/**
 * IfDirectiveParser
 *
 * @class
 * @extends {DirectiveParser}
 */
export default class IfDirectiveParser extends DirectiveParser {

    static priority = 2;

    /**
     * constructor
     *
     * @public
     * @param {Object} options 参数
     */
    constructor(options) {
        super(options);

        this[EXPRESSIONS] = [];
        this[BRANCH_TREES] = [];
        this[HAS_ELSE_BRANCH] = false;
        this.expressions = [];
    }

    /**
     * 搜集表达式
     *
     * @public
     * @override
     */
    collectExprs() {
        const branchNodeStack = [];
        // 这个计数器是用来处理if指令嵌套问题的。
        // 当nestCounter为0的时候，遇到的各种if相关指令才属于当前parser的，
        // 否则是嵌套的if指令
        let nestCounter = 0;
        Node.iterate(this.startNode, this.endNode, node => {
            let ifNodeType = getIfNodeType(node);
            // if
            if (ifNodeType === IfDirectiveParser.IF_START) {
                // 已经有了一个if分支，再来一个if分支，说明很可能是if嵌套
                if (branchNodeStack.length) {
                    ++nestCounter;
                    return;
                }

                branchNodeStack.push({node: node, type: ifNodeType});
            }
            // elif
            else if (ifNodeType === IfDirectiveParser.ELIF
                || ifNodeType === IfDirectiveParser.ELSE
            ) {
                // 有嵌套，就不管这个分支了
                if (nestCounter) {
                    return;
                }

                if (!branchNodeStack.length
                    || (
                        // 前面一个分支既不是`if`，也不是`elif`
                        branchNodeStack[branchNodeStack.length - 1].type !== IfDirectiveParser.IF_START
                        && branchNodeStack[branchNodeStack.length - 1].type !== IfDirectiveParser.ELIF
                    )
                ) {
                    throw new Error('wrong `if` directive syntax');
                }
                branchNodeStack.push({node: node, type: ifNodeType});
            }
            // /if
            else if (ifNodeType === IfDirectiveParser.IF_END) {
                // 有嵌套，此时要退出一层嵌套
                if (nestCounter) {
                    --nestCounter;
                    return;
                }

                branchNodeStack.push({node: node, type: ifNodeType});
            }

            // 是 if 节点或者 elif 节点，搜集表达式
            if (ifNodeType === IfDirectiveParser.IF_START
                || ifNodeType === IfDirectiveParser.ELIF
            ) {
                const rawExpr = node.getNodeValue().match(IF_ELIF_EXPRESSION_REG)[1];
                const expr = this.wrapRawExpression(rawExpr.replace(/\n/g, ' '));
                this[EXPRESSIONS].push(expr);

                const exprWatcher = this.getExpressionWatcher();
                exprWatcher.addExpr(expr);
                this.expressions.push(expr);
            }

            if (ifNodeType === IfDirectiveParser.ELSE) {
                this[HAS_ELSE_BRANCH] = true;
            }
        });

        for (let i = 0, il = branchNodeStack.length - 1; i < il; ++i) {
            let curNode = branchNodeStack[i];
            let nextNode = branchNodeStack[i + 1];

            let curNodeNextSibling = curNode.node.getNextSibling();
            // curNode 和 nextNode 之间没有节点
            if (curNodeNextSibling.equal(nextNode.node)) {
                this[BRANCH_TREES].push(null);
            }
            else {
                const branchTree = Tree.createTree({
                    startNode: curNodeNextSibling,
                    endNode: nextNode.node.getPreviousSibling()
                });
                branchTree.setParent(this.tree);

                this[BRANCH_TREES].push(branchTree);
                branchTree.compile();

                this.getScope().addChild(branchTree.rootScope);
            }
        }
    }

    /**
     * 将数据和DOM关联起来
     *
     * @public
     * @override
     */
    linkScope() {
        for (let i = 0, il = this[BRANCH_TREES].length; i < il; ++i) {
            this[BRANCH_TREES][i].link();
        }
    }

    /**
     * 初始渲染
     *
     * @public
     * @override
     * @param {Function} done 渲染结束触发的回调函数
     */
    initRender(done) {
        const doneChecker = new DoneChecker(done);
        doneChecker.add(done => {
            this.renderDOM(done);
        });

        const doneTaskFn = treeIndex => innerDone => this[BRANCH_TREES][treeIndex].initRender(innerDone);

        for (let i = 0, il = this[BRANCH_TREES].length; i < il; ++i) {
            doneChecker.add(doneTaskFn(i));
        }

        doneChecker.complete();
    }

    /**
     * 在相关表达式值发生变化时会触发的函数
     *
     * @public
     * @override
     * @param  {Event}   event 事件对象
     * @param  {Function} done  处理完成之后的回调函数
     */
    onExpressionChange(event, done) {
        const doneChecker = new DoneChecker(done);
        if (!this.isDark) {
            let hasExpr = false;
            for (let i = 0, il = this[EXPRESSIONS].length; i < il; ++i) {
                if (this[EXPRESSIONS][i] === event.expr) {
                    hasExpr = true;
                    break;
                }
            }

            if (hasExpr) {
                doneChecker.add(innerDone => this.renderDOM(innerDone));
            }
        }

        doneChecker.complete();
    }

    /**
     * 渲染界面
     *
     * @private
     * @param  {Function} done 渲染完成的回调函数
     */
    renderDOM(done) {
        const doneChecker = new DoneChecker(done);
        if (this.isDark) {
            doneChecker.complete();
            return;
        }

        const exprWatcher = this.getExpressionWatcher();
        const exprs = this[EXPRESSIONS];
        let hasShowBranch = false;
        let i = 0;
        for (let il = exprs.length; i < il; ++i) {
            let expr = exprs[i];
            let exprValue = exprWatcher.calculate(expr);
            let branchTree = this[BRANCH_TREES][i];
            if (exprValue) {
                hasShowBranch = true;
                doneChecker.add(innerDone => branchTree.restoreFromDark(innerDone));
            }
            else {
                doneChecker.add(innerDone => branchTree.goDark(innerDone));
            }
        }

        if (this[HAS_ELSE_BRANCH]) {
            doneChecker.add(
                innerDone => this[BRANCH_TREES][i][hasShowBranch ? 'goDark' : 'restoreFromDark'](innerDone)
            );
        }

        doneChecker.complete();
    }

    /**
     * 获取子节点
     *
     * @public
     * @override
     * @return {Array.<WrapNode>}
     */
    getChildNodes() {
        return [];
    }

    /**
     * 释放资源
     *
     * @override
     * @protected
     */
    release() {
        for (let i = 0, il = this[BRANCH_TREES].length; i < il; ++i) {
            this[BRANCH_TREES][i].destroy();
        }

        this[EXPRESSIONS] = null;
        this[BRANCH_TREES] = null;
        this.expressions = null;

        super.release();
    }

    /**
     * hide
     *
     * @public
     * @override
     * @param  {Function} done done
     */
    hide(done) {
        const doneChecker = new DoneChecker(done);
        this[BRANCH_TREES].forEach(
            tree => doneChecker.add(::tree.goDark)
        );
        doneChecker.complete();
    }

    /**
     * show
     *
     * @protected
     * @override
     * @param  {Function} done done
     */
    show(done) {
        const doneChecker = new DoneChecker(done);
        this[BRANCH_TREES].forEach(
            tree => doneChecker.add(::tree.restoreFromDark)
        );
        doneChecker.add(::this.renderDOM);
        doneChecker.complete();
    }

    /**
     * 判断节点是不是if指令的开始节点
     *
     * @public
     * @static
     * @override
     * @param  {WrapNode}  node   待判断的节点
     * @return {boolean}
     */
    static isProperNode(node) {
        return getIfNodeType(node) === IfDirectiveParser.IF_START;
    }

    /**
     * 判断是不是if节点的结束节点
     *
     * @public
     * @static
     * @override
     * @param  {WrapNode}  node   待判断的节点
     * @return {boolean}
     */
    static isEndNode(node) {
        return getIfNodeType(node) === IfDirectiveParser.IF_END;
    }

    /**
     * 找到if指令的结束节点
     *
     * @public
     * @static
     * @override
     * @param  {WrapNode} startNode 起始节点
     */
    static findEndNode(startNode) {
        return this.walkToEnd(startNode);
    }

    /**
     * 没有找到指令结束节点要抛出的错误
     *
     * @public
     * @static
     * @override
     * @return {Error}
     */
    static getNoEndNodeError() {
        return new Error('the if directive is not properly ended!');
    }
}

IfDirectiveParser.IF_START = 1;
IfDirectiveParser.ELIF = 2;
IfDirectiveParser.ELSE = 3;
IfDirectiveParser.IF_END = 4;

function getIfNodeType(node) {
    const nodeType = node.getNodeType();
    if (nodeType !== Node.COMMENT_NODE) {
        return;
    }

    const nodeValue = node.getNodeValue();
    if (IF_START_PREFIX_REG.test(nodeValue)) {
        return IfDirectiveParser.IF_START;
    }

    if (ELIF_PREFIX_REG.test(nodeValue)) {
        return IfDirectiveParser.ELIF;
    }

    if (ELSE_REG.test(nodeValue)) {
        return IfDirectiveParser.ELSE;
    }

    if (IF_END_REG.test(nodeValue)) {
        return IfDirectiveParser.IF_END;
    }
}
