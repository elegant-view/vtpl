/**
 * @file for 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';
import Node from '../nodes/Node';

const TEMPLATE_SEGMENT = Symbol('templateSegment');
const UPDATE_FUNCTION = Symbol('updateFunction');
const TREES = Symbol('trees');
const ITEM_VARIABLE_NAME = Symbol('itemVariableName');
const LIST_EXPRESSION = Symbol('listExpression');

export default class ForDirectiveParser extends DirectiveParser {

    constructor(options) {
        super(options);

        this[TEMPLATE_SEGMENT] = null;
        this[UPDATE_FUNCTION] = null;
        this[TREES] = [];
        this[ITEM_VARIABLE_NAME] = null;
        this[LIST_EXPRESSION] = null;
    }

    collectExprs() {
        // for指令之间没有节点，啥也不干
        if (this.startNode.getNextSibling().equal(this.endNode)) {
            return;
        }

        // 将for指令之间的节点抽出来，放在tplSeg里面作为样板缓存，后面会根据这个样板生成具体的DOM结构。
        const nodesManager = this.getNodesManager();
        this[TEMPLATE_SEGMENT] = nodesManager.createDocumentFragment('div');
        for (let curNode = this.startNode.getNextSibling();
            curNode && !curNode.isAfter(this.endNode.getPreviousSibling());
        ) {
            let nextNode = curNode.getNextSibling();
            this[TEMPLATE_SEGMENT].appendChild(curNode);
            curNode = nextNode;
        }

        let expr = this.startNode.getNodeValue().replace('for:', '');
        try {
            [, this[LIST_EXPRESSION], this[ITEM_VARIABLE_NAME]] = expr.match(/^\s*([$\w.\[\]]+)\s+as\s+([$\w]+)\s*$/);
        }
        catch (error) {
            throw new Error(`wrong for expression ${expr}`);
        }

        let exprWatcher = this.getExpressionWatcher();
        this[LIST_EXPRESSION] = `$\{${this[LIST_EXPRESSION]}}`;
        exprWatcher.addExpr(this[LIST_EXPRESSION]);

        this[UPDATE_FUNCTION] = this.createUpdateFn(
            this.startNode.getNextSibling(),
            this.endNode.getPreviousSibling()
        );
    }

    linkScope() {
        let exprWatcher = this.getExpressionWatcher();
        exprWatcher.on('change', event => {
            if (!this.isDark && event.expr === this[LIST_EXPRESSION]) {
                this[UPDATE_FUNCTION](event.newValue);
            }
        });
    }

    initRender() {
        let exprWatcher = this.getExpressionWatcher();
        this[UPDATE_FUNCTION](exprWatcher.calculate(this[LIST_EXPRESSION]));
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
        let itemVariableName = this[ITEM_VARIABLE_NAME];
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

                if (!parser[TREES][index]) {
                    parser[TREES][index] = parser.createTree();
                    parser[TREES][index].compile();
                    parser[TREES][index].link();
                    parser[TREES][index].initRender();
                }

                parser[TREES][index].restoreFromDark();
                parser[TREES][index].rootScope.set(local);

                ++index;
            }

            for (let i = index, il = parser[TREES].length; i < il; ++i) {
                parser[TREES][i].goDark();
            }
        };
    }

    goDark() {
        if (this.isDark) {
            return;
        }

        super.goDark();
        this[TREES].forEach(tree => tree.goDark());
    }

    restoreFromDark() {
        if (!this.isDark) {
            return;
        }

        super.restoreFromDark();
        const exprWatcher = this.getExpressionWatcher();
        this[UPDATE_FUNCTION](exprWatcher.calculate(this[LIST_EXPRESSION]));
    }

    destroy() {
        this[TREES].forEach(tree => tree.destroy());
        this[TREES] = null;
        this[TEMPLATE_SEGMENT] = null;
        this[UPDATE_FUNCTION] = null;
        this[ITEM_VARIABLE_NAME] = null;
        this[LIST_EXPRESSION] = null;

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
        let nodesManager = this.getNodesManager();
        let copySeg = nodesManager.createDocumentFragment('div');
        copySeg.setInnerHTML(this[TEMPLATE_SEGMENT].getInnerHTML());

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

    static findEndNode(...args) {
        return this.walkToEnd(...args);
    }

    static getNoEndNodeError() {
        return new Error('the `for` directive is not properly ended!');
    }
}
