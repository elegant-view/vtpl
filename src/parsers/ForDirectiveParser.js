/**
 * @file for 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';
import Node from '../nodes/Node';
import DoneChecker from '../DoneChecker';
import * as utils from '../utils';

const TEMPLATE_SEGMENT = Symbol('templateSegment');
const UPDATE_FUNCTION = Symbol('updateFunction');
const TREES = Symbol('trees');
const ITEM_VARIABLE_NAME = Symbol('itemVariableName');
const LIST_EXPRESSION = Symbol('listExpression');

/**
 * 匹配for开始指令的前缀
 *
 * @const
 * @type {RegExp}
 */
const FOR_START_PREFIX_REG = /^\s*for:\s*/;

/**
 * 匹配for结束指令的前缀
 *@const
 * @type {RegExp}
 */
const FOR_END_PREFIX_REG = /^\s*\/for\s*$/;

/**
 * 匹配for指令中涉及到的表达式
 *
 * @const
 * @type  {RegExp}
 */
const EXPRESSION_MATCHER_REG = /^\s*([$\w.\[\]]+)\s+as\s+([$\w]+)\s*$/;

/**
 * ForDirectiveParser
 *
 * @class
 * @extends {DirectiveParser}
 */
export default class ForDirectiveParser extends DirectiveParser {

    static priority = 2;

    /**
     * constructor
     *
     * @public
     * @param  {Object} options 参数
     */
    constructor(options) {
        super(options);

        this[TEMPLATE_SEGMENT] = null;
        this[UPDATE_FUNCTION] = null;
        this[TREES] = [];
        this[ITEM_VARIABLE_NAME] = null;
        this[LIST_EXPRESSION] = null;

        this.expressions = [];
    }

    /**
     * 搜集表达式，生成DOM更新函数
     *
     * @public
     * @override
     */
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
            const nextNode = curNode.getNextSibling();
            this[TEMPLATE_SEGMENT].appendChild(curNode);
            curNode = nextNode;
        }

        const expr = utils.trim(this.startNode.getNodeValue().replace(FOR_START_PREFIX_REG, ''));
        try {
            [, this[LIST_EXPRESSION], this[ITEM_VARIABLE_NAME]] = expr.match(EXPRESSION_MATCHER_REG);
        }
        catch (error) {
            throw new Error(`wrong for expression: ${expr}`);
        }

        let exprWatcher = this.getExpressionWatcher();
        this[LIST_EXPRESSION] = this.wrapRawExpression(this[LIST_EXPRESSION]);
        exprWatcher.addExpr(this[LIST_EXPRESSION]);
        this.expressions.push(this[LIST_EXPRESSION]);

        this[UPDATE_FUNCTION] = this.createUpdateFn(
            this.startNode.getNextSibling(),
            this.endNode.getPreviousSibling()
        );
    }

    /**
     * 初始化渲染
     *
     * @public
     * @override
     * @param  {Function} done 完成（做完DOM操作）初始化渲染的回调函数
     */
    initRender(done) {
        const exprWatcher = this.getExpressionWatcher();
        this[UPDATE_FUNCTION](exprWatcher.calculate(this[LIST_EXPRESSION]), done);
    }

    /**
     * 当前解析器实例所涉及到的表达式的值发生变化之后，会触发的方法
     *
     * @public
     * @override
     * @param  {Event}   event 事件对象
     * @param  {Function} done  完成DOM操作之后的回调函数
     */
    onExpressionChange(event, done) {
        const doneChecker = new DoneChecker(done);
        if (!this.isDark && event.expr === this[LIST_EXPRESSION]) {
            doneChecker.add(done => {
                this[UPDATE_FUNCTION](event.newValue, done);
            });
        }
        doneChecker.complete();
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
        return (listObj, done) => {
            const doneChecker = new DoneChecker(done);
            let index = 0;
            /* eslint-disable guard-for-in */
            /* eslint-disable fecs-use-for-of */
            for (let k in listObj) {
            /* eslint-enable fecs-use-for-of */
            /* eslint-enable guard-for-in */
                const local = {
                    key: k,
                    index: index,
                    [itemVariableName]: listObj[k]
                };

                if (!parser[TREES][index]) {
                    parser[TREES][index] = parser.createTree();
                    parser[TREES][index].compile();
                    parser[TREES][index].link();

                    /* eslint-disable no-loop-func */
                    doneChecker.add(::parser[TREES][index].initRender);
                    doneChecker.add(innerDone => parser[TREES][index].rootScope.set(local, false, innerDone));
                }
                else {
                    doneChecker.add(::parser[TREES][index].restoreFromDark);
                    doneChecker.add(innerDone => parser[TREES][index].rootScope.set(local, false, innerDone));
                    /* eslint-enable no-loop-func */
                }

                ++index;
            }

            for (let i = index, il = parser[TREES].length; i < il; ++i) {
                /* eslint-disable no-loop-func */
                doneChecker.add(innerDone => {
                    parser[TREES][i].goDark(innerDone);
                });
                /* eslint-enable no-loop-func */
            }

            doneChecker.complete();
        };
    }

    /**
     * 隐藏。隐藏之后，该指令管辖范围的表达式变化不会触发界面的变化
     *
     * @override
     * @protected
     * @param  {Function} done 处理结束的回调函数
     */
    hide(done) {
        const doneChecker = new DoneChecker(done);
        this[TREES].forEach(tree => doneChecker.add(::tree.goDark));
        doneChecker.complete();
    }

    /**
     * 显示。显示之后，该指令管辖范围的表达式变化才会触发界面的变化
     *
     * @override
     * @protected
     * @param  {Function} done 处理结束的回调函数
     */
    show(done) {
        const doneChecker = new DoneChecker(done);
        const exprWatcher = this.getExpressionWatcher();
        doneChecker.add(done => this[UPDATE_FUNCTION](exprWatcher.calculate(this[LIST_EXPRESSION]), done));
        doneChecker.complete();
    }

    /**
     * 释放资源
     *
     * @override
     * @protected
     */
    release() {
        this[TREES].forEach(tree => tree.destroy());
        this[TREES] = null;
        this[TEMPLATE_SEGMENT] = null;
        this[UPDATE_FUNCTION] = null;
        this[ITEM_VARIABLE_NAME] = null;
        this[LIST_EXPRESSION] = null;
        this.expressions = null;

        super.release();
    }

    /**
     * 创建树
     *
     * @protected
     * @override
     * @return {Tree}
     */
    createTree() {
        const parser = this;
        const nodesManager = this.getNodesManager();
        const copySeg = nodesManager.createDocumentFragment('div');
        copySeg.setInnerHTML(this[TEMPLATE_SEGMENT].getInnerHTML());

        const childNodes = copySeg.getChildNodes();
        const startNode = childNodes[0];
        const endNode = childNodes[childNodes.length - 1];

        let curNode = startNode;
        while (curNode && !curNode.isAfter(endNode)) {
            const nextNode = curNode.getNextSibling();
            parser.endNode.getParentNode().insertBefore(curNode, parser.endNode);
            curNode = nextNode;
        }

        const tree = super.createTree(this.tree, startNode, endNode);
        return tree;
    }

    /**
     * 获取需要遍历的子孙节点。主要用于遍历的时候，不让遍历器进入子孙节点
     *
     * @override
     * @public
     * @return {Array.<WrapNode>}
     */
    getChildNodes() {
        return [];
    }

    /**
     * 获取结束节点
     *
     * @override
     * @public
     * @return {WrapNode}
     */
    getEndNode() {
        return this.endNode;
    }

    /**
     * 获取指令的开始节点
     *
     * @override
     * @public
     * @return {WrapNode}
     */
    getStartNode() {
        return this.startNode;
    }

    /**
     * 判断是不是for指令的开始节点
     *
     * @static
     * @override
     * @public
     * @param  {WrapNode}  node   待判断的节点
     * @return {boolean}
     */
    static isProperNode(node) {
        return DirectiveParser.isProperNode(node)
            && FOR_START_PREFIX_REG.test(node.getNodeValue());
    }

    /**
     * 判断是不是for指令结束节点
     *
     * @static
     * @override
     * @public
     * @param  {WrapNode}  node   待判断的节点
     * @return {boolean}
     */
    static isEndNode(node) {
        let nodeType = node.getNodeType();
        return nodeType === Node.COMMENT_NODE
            && FOR_END_PREFIX_REG.test(node.getNodeValue());
    }

    /**
     * 从for指令开始节点开始，找到for指令结束节点，此处会处理for指令嵌套的问题
     *
     * @static
     * @override
     * @public
     * @param  {WrapNode} startNode 开始节点
     * @return {WrapNode}
     */
    static findEndNode(startNode) {
        return this.walkToEnd(startNode);
    }

    /**
     * 如果没有找到结束节点，需要生成的错误对象。
     *
     * @static
     * @override
     * @public
     * @return {Error}
     */
    static getNoEndNodeError() {
        return new Error('the `for` directive is not properly ended!');
    }
}
