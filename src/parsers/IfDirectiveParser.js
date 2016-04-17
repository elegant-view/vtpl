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

const EXPRESSIONS = Symbol('expressions');
const BRANCH_TREES = Symbol('branchTrees');
const HAS_ELSE_BRANCH = Symbol('hasElseBranch');

export default class IfDirectiveParser extends DirectiveParser {

    constructor(options) {
        super(options);

        this[EXPRESSIONS] = [];
        this[BRANCH_TREES] = [];
        this[HAS_ELSE_BRANCH] = false;
    }

    collectExprs() {
        const branchNodeStack = [];
        // 这个计数器是用来处理if指令嵌套问题的。
        // 当nestCounter为0的时候，遇到的各种if相关指令才属于当前parser的，
        // 否则是嵌套的if指令
        let nestCounter = 0;
        const config = this.getConfig();
        Node.iterate(this.startNode, this.endNode, node => {
            let ifNodeType = getIfNodeType(node, this.getConfig());
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
                let expr = '${' + node.getNodeValue().replace(config.getAllIfRegExp(), '') + '}';
                expr = expr.replace(/\n/g, ' ');
                this[EXPRESSIONS].push(expr);

                let exprWatcher = this.getExpressionWatcher();
                exprWatcher.addExpr(expr);
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
                branchTree.rootScope.setParent(this.getScope());
            }
        }
    }

    linkScope() {
        const exprWatcher = this.getExpressionWatcher();

        for (let i = 0, il = this[BRANCH_TREES].length; i < il; ++i) {
            this[BRANCH_TREES][i].link();
        }

        exprWatcher.on('change', event => {
            if (this.isDark) {
                return;
            }

            let hasExpr = false;
            for (let i = 0, il = this[EXPRESSIONS].length; i < il; ++i) {
                if (this[EXPRESSIONS][i] === event.expr) {
                    hasExpr = true;
                    break;
                }
            }

            if (!hasExpr) {
                return;
            }

            this.renderDOM(this);
        });
    }

    initRender() {
        this.renderDOM(this);

        for (let i = 0, il = this[BRANCH_TREES].length; i < il; ++i) {
            this[BRANCH_TREES][i].initRender();
        }
    }

    renderDOM() {
        if (this.isDark) {
            return;
        }

        let exprWatcher = this.getExpressionWatcher();
        let exprs = this[EXPRESSIONS];
        let hasShowBranch = false;
        let i = 0;
        for (let il = exprs.length; i < il; ++i) {
            let expr = exprs[i];
            let exprValue = exprWatcher.calculate(expr);
            let branchTree = this[BRANCH_TREES][i];
            if (exprValue) {
                hasShowBranch = true;
                branchTree.restoreFromDark();
            }
            else {
                branchTree.goDark();
            }
        }

        if (this[HAS_ELSE_BRANCH]) {
            this[BRANCH_TREES][i][hasShowBranch ? 'goDark' : 'restoreFromDark']();
        }
    }

    getChildNodes() {
        return [];
    }

    destroy() {
        for (let i = 0, il = this[BRANCH_TREES].length; i < il; ++i) {
            let branchTree = this[BRANCH_TREES][i];
            branchTree.destroy();
        }

        this[EXPRESSIONS] = null;
        this[BRANCH_TREES] = null;

        super.destroy();
    }

    // 转入隐藏状态
    goDark() {
        if (this.isDark) {
            return;
        }
        super.goDark();
        this[BRANCH_TREES].forEach(tree => tree.goDark());
    }

    // 从隐藏状态恢复
    restoreFromDark() {
        if (!this.isDark) {
            return;
        }
        super.restoreFromDark();
        this[BRANCH_TREES].forEach(tree => tree.restoreFromDark());

        this.renderDOM();
    }

    static isProperNode(node, config) {
        return getIfNodeType(node, config) === IfDirectiveParser.IF_START;
    }

    static isEndNode(node, config) {
        return getIfNodeType(node, config) === IfDirectiveParser.IF_END;
    }

    static findEndNode(...args) {
        return this.walkToEnd(...args);
    }

    static getNoEndNodeError() {
        return new Error('the if directive is not properly ended!');
    }
}

IfDirectiveParser.IF_START = 1;
IfDirectiveParser.ELIF = 2;
IfDirectiveParser.ELSE = 3;
IfDirectiveParser.IF_END = 4;

function getIfNodeType(node, config) {
    let nodeType = node.getNodeType();
    if (nodeType !== Node.COMMENT_NODE) {
        return;
    }

    let nodeValue = node.getNodeValue();
    if (config.ifPrefixRegExp.test(nodeValue)) {
        return IfDirectiveParser.IF_START;
    }

    if (config.elifPrefixRegExp.test(nodeValue)) {
        return IfDirectiveParser.ELIF;
    }

    if (config.elsePrefixRegExp.test(nodeValue)) {
        return IfDirectiveParser.ELSE;
    }

    if (config.ifEndPrefixRegExp.test(nodeValue)) {
        return IfDirectiveParser.IF_END;
    }
}
