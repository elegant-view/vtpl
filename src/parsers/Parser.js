/**
 * @file 解析器的抽象基类。
 *       对于节点类的解析器来说，只会包含一个节点，而对于指令类型的解析器来说，一般会包含两个节点，
 *       所以解析器统一使用两个节点。
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Base from '../Base';
import parserState from './parserState';
import Tree from '../trees/Tree';
import Node from '../nodes/Node';

const STATE = Symbol('state');
const TREE = Symbol('tree');

const START_NODE = Symbol('startNode');
const END_NODE = Symbol('endNode');

const IS_DARK = Symbol('isDark');

export default class Parser extends Base {
    constructor(options) {
        super(options);

        if (!(options.tree instanceof Tree)) {
            throw new Error('you should pass in a `Tree`');
        }
        this[TREE] = options.tree;

        this[STATE] = parserState.INITIALIZING;

        if (!Node.isNode(options.startNode) || !Node.isNode(options.endNode)) {
            throw new Error('you should pass in `startNode` and `endNode`');
        }
        this[START_NODE] = options.startNode;
        this[END_NODE] = options.endNode;

        this[IS_DARK] = false;
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
     * 隐藏当前parser实例相关的节点。具体子类实现
     *
     * @public
     * @abstract
     */
    goDark() {
        this[IS_DARK] = true;
    }

    /**
     * 显示相关元素
     *
     * @public
     * @abstract
     */
    restoreFromDark() {
        this[IS_DARK] = false;
    }

    get isDark() {
        return this[IS_DARK];
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
     * 初始渲染
     *
     * @public
     */
    initRender() {}

    /**
     * 从 DOM 树中移除对应的节点。
     * startNode 和 endNode 必须是兄弟节点
     *
     * @protected
     * @param {Node} startNode 开始节点
     * @param {Node} endNode 结束节点
     */
    removeFromDOM(startNode, endNode) {
        if (!Node.isNode(startNode) || !Node.isNode(endNode)) {
            return;
        }

        Node.iterate(startNode, endNode, curNode => {
            const nextNode = startNode.getNextSibling();
            curNode.remove();
            return {
                type: 'options',
                getChildNodes: () => [],
                getNextNode: () => nextNode
            };
        });
    }

    /**
     * 销毁解析器，将界面恢复成原样
     *
     * @public
     */
    destroy() {
        // parser是附着在tree上面的，所以在销毁parser的时候，
        // 不要调用tree.destroy()，否则会引起无限递归
        this[TREE] = null;
    }
}
