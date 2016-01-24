/**
 * @file if 指令。
 *       在实现中有个纠结点：如果if指令嵌套的话，外层if的branchTree不能直接向下广播change事件，但是branchTree又要能够拿到外层scope的数据。
 *       处理方式：
 *           renderToDom方法用于将scopeModel中的变化反应到DOM中去，如果某个分支处于不该显示的状态，会有一个godark的标记。
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';
import {each, extend} from '../utils';
import Tree from '../trees/Tree';
import Node from '../nodes/Node';

class IfDirectiveParser extends DirectiveParser {

    constructor(options) {
        super(options);

        this.startNode = options.startNode;
        this.endNode = options.endNode;

        this.exprs = [];
        this.exprFns = {};
        this.$branchTrees = [];

        this.isGoDark = false;
    }

    collectExprs() {
        let branchNodeStack = [];
        // 这个计数器是用来处理if指令嵌套问题的。
        // 当nestCounter为0的时候，遇到的各种if相关指令才属于当前parser的，
        // 否则是嵌套的if指令
        let nestCounter = 0;
        let me = this;
        let config = this.tree.getTreeVar('config');
        Node.iterate(this.startNode, this.endNode, function (node) {
            let ifNodeType = getIfNodeType(node, me.tree.getTreeVar('config'));
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
                let expr = node.getNodeValue().replace(config.getAllIfRegExp(), '');
                expr = expr.replace(/\n/g, ' ');
                me.exprs.push(expr);

                if (!me.exprFns[expr]) {
                    me.exprFns[expr] = me.createExprFn(expr);
                }
            }

            if (ifNodeType === IfDirectiveParser.ELSE) {
                me.$$hasElseBranch = true;
            }
        });

        for (let i = 0, il = branchNodeStack.length - 1; i < il; ++i) {
            let curNode = branchNodeStack[i];
            let nextNode = branchNodeStack[i + 1];

            let curNodeNextSibling = curNode.node.getNextSibling();
            // curNode 和 nextNode 之间没有节点
            if (curNodeNextSibling.equal(nextNode.node)) {
                this.$branchTrees.push(null);
            }
            else {
                let branchTree = new Tree({
                    startNode: curNodeNextSibling,
                    endNode: nextNode.node.getPreviousSibling()
                });
                branchTree.setParent(this.tree);

                this.$branchTrees.push(branchTree);
                branchTree.compile();

                this.tree.rootScope.addChild(branchTree.rootScope);
                branchTree.rootScope.setParent(this.tree.rootScope);
            }
        }
    }

    /**
     * 创建表达式的值计算函数
     *
     * @private
     * @param  {string} branchExpr 分支表达式，类似于：`name==='yibuyisheng'` 或者 `!name`。
     *                       注意：if:或者elif:后面必须是合法的javascript表达式
     * @return {function(ScopeModel):*}      表达式值计算函数
     */
    createExprFn(branchExpr) {
        let exprCalculater = this.tree.getTreeVar('exprCalculater');
        let {paramNames} = exprCalculater.createExprFn(branchExpr, false);
        this.addParamName2ExprMap(paramNames, branchExpr);
        return scopeModel => {
            return exprCalculater.calculate(branchExpr, false, this.tree.rootScope);
        };
    }

    linkScope() {
        this.renderToDom();

        for (let i = 0, il = this.$branchTrees.length; i < il; ++i) {
            this.$branchTrees[i].link();
        }

        this.listenToChange(this.tree.rootScope, event => {
            this.renderToDom(event.changes);
        });
    }

    /**
     * 看看每个分支表达式的计算值，然后决定哪一个分支应该显示出来
     * （其余的隐藏掉，隐藏掉的部分暂停做界面更新相关操作，直到显示出来）
     *
     * @protected
     * @param  {Array.<Object>} changes 数据改变
     */
    renderToDom(changes) {
        if (this.isGoDark) {
            return;
        }

        // if (changes === undefined) {
        //     update.call(this);
        //     return;
        // }

        // // 只要发现分支中有表达式的值可能会变，就要重新计算一下分支的显示情况了。
        // for (let i = 0, il = changes.length; i < il; ++i) {
        //     let change = changes[i];
        //     let exprs = this.getExprsByParamName(change.name);
        //     if (exprs && exprs.length) {
        //         update.call(this);
        //         return;
        //     }
        // }

        // 这里不能按照changes来决定是否应该计算分支表达式的值，会给嵌套的场景引入问题（子if不更新）
        update.call(this);

        function update() {
            let exprs = this.exprs;
            let hasShowBranch = false;
            let i = 0;
            for (let il = exprs.length; i < il; ++i) {
                let expr = exprs[i];
                let exprValue = this.exprFns[expr](this.tree.rootScope);
                if (exprValue) {
                    hasShowBranch = true;
                    restoreFromDark(this.$branchTrees[i]);
                }
                else {
                    this.$branchTrees[i].goDark();
                }
            }

            if (this.$$hasElseBranch) {
                !hasShowBranch
                    ? restoreFromDark(this.$branchTrees[i])
                    : this.$branchTrees[i].goDark();
            }
        }

        function restoreFromDark(branchTree) {
            branchTree.restoreFromDark();
        }
    }

    getChildNodes() {
        return [];
    }

    destroy() {
        for (let i = 0, il = this.$branchTrees.length; i < il; ++i) {
            let branchTree = this.$branchTrees[i];
            branchTree.destroy();
        }

        this.startNode = null;
        this.endNode = null;
        this.exprs = null;
        this.exprFns = null;
        this.$branchTrees = null;

        DirectiveParser.prototype.destroy.call(this);
    }

    getStartNode() {
        return this.startNode;
    }

    getEndNode() {
        return this.endNode;
    }

    // 转入隐藏状态
    goDark() {
        if (this.isGoDark) {
            return;
        }
        each(this.$branchTrees, tree => tree.goDark());
        this.isGoDark = true;
    }

    // 从隐藏状态恢复
    restoreFromDark() {
        if (!this.isGoDark) {
            return;
        }
        each(this.$branchTrees, tree => tree.restoreFromDark());
        this.isGoDark = false;
    }

    static isProperNode(node, config) {
        return getIfNodeType(node, config) === IfDirectiveParser.IF_START;
    }

    static isEndNode(node, config) {
        return getIfNodeType(node, config) === IfDirectiveParser.IF_END;
    }

    static findEndNode() {
        return this.walkToEnd.apply(this, arguments);
    }

    static getNoEndNodeError() {
        return new Error('the if directive is not properly ended!');
    }
}

extend(IfDirectiveParser, {
    IF_START: 1,
    ELIF: 2,
    ELSE: 3,
    IF_END: 4
});

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

Tree.registeParser(IfDirectiveParser);
export default IfDirectiveParser;
