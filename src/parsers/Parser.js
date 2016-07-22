/**
 * @file 解析器的抽象基类。
 *       对于节点类的解析器来说，只会包含一个节点，而对于指令类型的解析器来说，一般会包含两个节点，
 *       所以解析器统一使用两个节点。
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DarkEntity from '../DarkEntity';
import parserState from './parserState';
import Tree from '../trees/Tree';
import Node from '../nodes/Node';
import DomUpdater from '../DomUpdater';
import ExprWatcher from '../ExprWatcher';
import ExprCalculater from '../ExprCalculater';
import NodesManager from '../nodes/NodesManager';

const STATE = Symbol('state');
const TREE = Symbol('tree');

const START_NODE = Symbol('startNode');
const END_NODE = Symbol('endNode');

/**
 *	Parser生命周期：
 *	1、构造函数初始化；
 *	2、collectExprs遍历DOM树，搜集表达式；
 *	3、linkScope与作用域绑定；
 *	4、initRender初始化渲染；
 *	5、监听scope中数据变化，以便更新DOM（调用onExpressionChange方法）；
 *	6、销毁。
 *
 * @class
 */
export default class Parser extends DarkEntity {
    constructor(options) {
        super(options);

        // if (!(options.tree instanceof Tree)) {
        //     throw new Error('you should pass in a `Tree`');
        // }
        // if (!Node.isNode(options.startNode) || !Node.isNode(options.endNode)) {
        //     throw new Error('you should pass in `startNode` and `endNode`');
        // }

        this[TREE] = options.tree;
        this[STATE] = parserState.INITIALIZING;
        this[START_NODE] = options.startNode;
        this[END_NODE] = options.endNode;
    }

    get startNode() {
        return this[START_NODE];
    }

    set startNode(startNode) {
        this[START_NODE] = startNode;
    }

    get endNode() {
        return this[END_NODE];
    }

    set endNode(endNode) {
        this[END_NODE] = endNode;
    }

    get tree() {
        return this[TREE];
    }

    get state() {
        return this[STATE];
    }

    set state(state) {
        let illegal = false;
        for (let key in parserState) {
            if (parserState[key] === state) {
                illegal = true;
                break;
            }
        }
        if (!illegal) {
            throw new TypeError('wrong state value');
        }

        this[STATE] = state;
    }

    /**
     * 获取解析器当前状态下的开始DOM节点。
     *
     * 由于有的解析器会将之前的节点移除掉，那么就会对遍历带来影响了，
     * 所以此处提供两个获取开始节点和结束节点的方法。
     *
     * @public
     * @return {Node} DOM节点对象
     */
    getStartNode() {
        return this[START_NODE];
    }

    /**
     * 获取解析器当前状态下的结束DOM节点
     *
     * @public
     * @return {Node} 节点对象
     */
    getEndNode() {
        return this[END_NODE];
    }

    /**
     * 搜集表达式，生成表达式函数和 DOM 更新函数。具体子类实现
     *
     * @abstract
     * @public
     */
    collectExprs() {
    }

    /**
     * 绑定scope model
     *
     * @public
     */
    linkScope() {}

    /**
     * 获得自己监听的表达式，这样就可以判断要不要响应当前change事件了。
     * 这个方法在Tree中被调用，这样就可以构建`expresion->受影响的parsers`的映射了，
     * 然后后续每次表达式变化的时候就能快速定位到相应的parser
     *
     * @public
     * @return {Array.<string>} 解析器数组
     */
    getOwnExpressions() {
        return this.expressions || [];
    }

    /**
     * 表达式发生变化的回调函数，子类应该覆盖这个方法。
     *
     * @protected
     * @param  {Event}   event 事件对象
     * @param  {Function} done  执行完之后的回调函数
     */
    onExpressionChange(event, done) {
        done();
    }

    /**
     * 初始渲染
     *
     * @public
     * @abstract
     */
    initRender() {
        throw new Error('please implement this method');
    }

    /**
     * 从 DOM 树中移除对应的节点。
     * startNode 和 endNode 必须是兄弟节点
     *
     * @protected
     * @param {Node} startNode 开始节点
     * @param {Node} endNode 结束节点
     */
    removeFromDOM(startNode, endNode) {
        Node.removeFromDOM(startNode, endNode);
    }

    /**
     * 获取domUpdater
     *
     * @protected
     * @return {DomUpdater}
     */
    getDOMUpdater() {
        const domUpdater = this[TREE].getTreeVar('domUpdater');
        if (!(domUpdater instanceof DomUpdater)) {
            throw new Error('no DOM updater');
        }
        return domUpdater;
    }

    /**
     * 获取expression watcher
     *
     * @protected
     * @return {ExprWatcher}
     */
    getExpressionWatcher() {
        const exprWatcher = this[TREE].getExprWatcher();
        if (!(exprWatcher instanceof ExprWatcher)) {
            throw new Error('no expression watcher');
        }
        return exprWatcher;
    }

    getExpressionCalculater() {
        const exprCalculater = this[TREE].getTreeVar('exprCalculater');
        if (!(exprCalculater instanceof ExprCalculater)) {
            throw new Error('no expression calculater');
        }
        return exprCalculater;
    }

    getNodesManager() {
        const nodeManager = this[TREE].getTreeVar('nodesManager');
        if (!(nodeManager instanceof NodesManager)) {
            throw new Error('no node manager');
        }
        return nodeManager;
    }

    getScope() {
        const rootScope = this[TREE].rootScope;
        return rootScope;
    }

    /**
     * 根据父级数创建子树。
     *
     * @protected
     * @param  {Tree} parentTree 父级树
     * @param {nodes/Node} startNode 开始节点
     * @param {nodes/Node} endNode 结束节点
     * @return {Tree}  创建好的子树
     */
    createTree(parentTree, startNode, endNode) {
        const tree = Tree.createTree({startNode, endNode});
        tree.setParent(parentTree);
        parentTree.rootScope.addChild(tree.rootScope);
        return tree;
    }

    /**
     * 移除使用 createTree 创建好的树
     *
     * @protected
     * @param {Tree} tree 要移除的树
     */
    removeTree(tree) {
        const treeScope = tree.rootScope;
        tree.destroy();
        this.tree.rootScope.removeChild(treeScope);
        tree.setParent(null);
    }

    /**
     * 判断指定字符串是不是表达式
     *
     * @protected
     * @param  {string}  expr 带有前后缀的表达式
     * @return {boolean}
     */
    isExpression(expr) {
        return /{.+?}/.test(expr);
    }

    /**
     * 将没有前后缀的表达式用前后缀包裹起来
     *
     * @protected
     * @param {string} expr 待包裹的表达式
     * @return {string}
     */
    wrapRawExpression(expr) {
        return `{${expr}}`;
    }

    /**
     * 销毁解析器，将界面恢复成原样
     *
     * @override
     * @protected
     */
    release() {
        // parser是附着在tree上面的，所以在销毁parser的时候，
        // 不要调用tree.destroy()，否则会引起无限递归
        this[TREE] = null;

        this[STATE] = parserState.DESTROIED;
        this[START_NODE] = null;
        this[END_NODE] = null;
    }
}
