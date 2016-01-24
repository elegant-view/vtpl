/**
 * @file for 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';
import {each} from '../utils';
import Tree from '../trees/Tree';
import Node from '../nodes/Node';

class ForDirectiveParser extends DirectiveParser {

    constructor(options) {
        super(options);

        this.startNode = options.startNode;
        this.endNode = options.endNode;

        this.tplSeg = null;
        this.expr = null;
        this.exprFn = null;
        this.updateFn = null;
        this.trees = [];

        this.$$itemVariableName = null;
    }

    collectExprs() {
        // for指令之间没有节点
        if (this.startNode.getNextSibling().equal(this.endNode)) {
            return;
        }

        // 将for指令之间的节点抽出来，放在tplSeg里面作为样板缓存，后面会根据这个样板生成具体的DOM结构。
        let nodesManager = this.tree.getTreeVar('nodesManager');
        this.tplSeg = nodesManager.createElement('div');
        for (let curNode = this.startNode.getNextSibling();
            curNode && !curNode.isAfter(this.endNode.getPreviousSibling());
        ) {
            let nextNode = curNode.getNextSibling();
            this.tplSeg.appendChild(curNode);
            curNode = nextNode;
        }

        this.expr = this.startNode.getNodeValue().replace('for:', '');
        this.exprFn = this.createExprFn(this.expr);
        this.updateFn = this.createUpdateFn(
            this.startNode.getNextSibling(),
            this.endNode.getPreviousSibling()
        );
    }

    /**
     * for指令的表达式格式为：
     * `[list] as [item]`
     * 其中list就是要迭代的对象，可以是数组或对象；
     * item是每一项的值，对于数组，就是数组元素，对于对象，就是键值；
     * 还有隐藏变量：
     * key是每一项的键，对于数组，就是下标索引，对于对象，就是键；
     * index是索引，对于数组，就是下标索引，对于对象，就是迭代次数。
     *
     * @private
     * @param  {string} expr for指令表达式
     * @return {function(ScopeModel):Array|Object}
     */
    createExprFn(expr) {
        let exprMatch = expr.match(/^\s*([$\w.\[\]]+)\s+as\s+([$\w]+)\s*$/);
        if (!exprMatch || exprMatch.length !== 3) {
            throw new Error(`wrong for expression: ${expr}`);
        }

        let exprCalculater = this.tree.getTreeVar('exprCalculater');
        let {paramNames} = exprCalculater.createExprFn(exprMatch[1], false);
        this.addParamName2ExprMap(paramNames, expr);
        this.$$itemVariableName = exprMatch[2];
        return scopeModel => {
            let list = exprCalculater.calculate(exprMatch[1], false, scopeModel);
            return list;
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
            update.call(this);
            return;
        }

        for (let i = 0, il = changes.length; i < il; ++i) {
            let exprs = this.getExprsByParamName(changes[i].name);
            if (exprs && exprs.length) {
                update.call(this);
                return;
            }
        }

        function update() {
            let listObj = this.exprFn(this.tree.rootScope);
            if (this.dirtyCheck(this.expr, listObj, this.exprOldValue)) {
                this.updateFn(listObj);
            }
            this.exprOldValue = listObj;
        }
    }

    goDark() {
        if (this.isGoDark) {
            return;
        }
        each(this.trees, tree => tree.goDark());
        this.isGoDark = true;
    }

    restoreFromDark() {
        if (!this.isGoDark) {
            return;
        }
        each(this.trees, tree => tree.restoreFromDark());
        this.isGoDark = false;
    }

    destroy() {
        each(this.trees, tree => tree.destroy());

        this.tplSeg = null;
        this.expr = null;
        this.exprFn = null;
        this.updateFn = null;
        this.startNode = null;
        this.endNode = null;

        super.destroy();
    }

    /**
     * 创建树
     *
     * @protected
     * @return {Tree}
     */
    createTree() {
        let parser = this;
        let nodesManager = this.tree.getTreeVar('nodesManager');
        let copySeg = nodesManager.createElement('div');
        copySeg.setInnerHTML(this.tplSeg.getInnerHTML());

        let childNodes = copySeg.getChildNodes();
        let startNode = childNodes[0];
        let endNode = childNodes[childNodes.length - 1];

        let curNode = startNode;
        while (curNode && !curNode.isAfter(endNode)) {
            let nextNode = curNode.getNextSibling();
            parser.endNode.getParentNode().insertBefore(curNode, parser.endNode);
            curNode = nextNode;
        }

        let tree = super.createTree(this.tree, startNode, endNode);
        return tree;
    }

    /**
     * 创建更新函数。
     * 更新函数会根据迭代的数据动态地创建Tree实例：迭代了多少次，就会创建多少个。
     * for指令下的Tree实例目前是不会销毁的，除非解析器实例被销毁。
     * for指令下的Tree实例只会随着迭代次数的增加而增多，并不会消减。
     *
     * @private
     * @param  {nodes/Node} startNode 起始节点
     * @param  {nodes/Node} endNode   结束节点
     * @return {function(*,ScopeModel)}           dom更新函数
     */
    createUpdateFn(startNode, endNode) {
        let parser = this;
        let itemVariableName = this.$$itemVariableName;
        return listObj => {
            let index = 0;
            /* eslint-disable guard-for-in */
            for (let k in listObj) {
            /* eslint-enable guard-for-in */
                let local = {
                    key: k,
                    index: index
                };
                local[itemVariableName] = listObj[k];

                if (!parser.trees[index]) {
                    parser.trees[index] = parser.createTree();
                    parser.trees[index].compile();
                    parser.trees[index].link();
                }

                parser.trees[index].restoreFromDark();
                parser.trees[index].rootScope.set(local);

                ++index;
            }

            for (let i = index, il = parser.trees.length; i < il; ++i) {
                parser.trees[i].goDark();
            }
        };
    }

    // 主要用于遍历的时候，不让遍历器进入子孙节点
    getChildNodes() {
        return [];
    }

    getEndNode() {
        return this.endNode;
    }

    getStartNode() {
        return this.startNode;
    }

    static isProperNode(node, config) {
        return DirectiveParser.isProperNode(node, config)
            && config.forPrefixRegExp.test(node.getNodeValue());
    }

    static isEndNode(node, config) {
        let nodeType = node.getNodeType();
        return nodeType === Node.COMMENT_NODE
            && config.forEndPrefixRegExp.test(node.getNodeValue());
    }

    static findEndNode() {
        return this.walkToEnd.apply(this, arguments);
    }

    static getNoEndNodeError() {
        return new Error('the `for` directive is not properly ended!');
    }
}

Tree.registeParser(ForDirectiveParser);
export default ForDirectiveParser;
