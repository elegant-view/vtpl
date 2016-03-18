/**
 * @file 解析器的抽象基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Base from '../Base';
import parserState from './parserState';

export default class Parser extends Base {
    constructor(options) {
        super(options);

        this.$state = parserState.INITIALIZING;
        this.tree = options.tree;
    }

    /**
     * 隐藏当前parser实例相关的节点。具体子类实现
     *
     * @public
     * @abstract
     */
    goDark() {}

    /**
     * 显示相关元素
     *
     * @public
     * @abstract
     */
    restoreFromDark() {}

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
        return this.startNode;
    }

    /**
     * 获取解析器当前状态下的结束DOM节点
     *
     * @public
     * @return {Node} 节点对象
     */
    getEndNode() {
        return this.endNode;
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
     * 销毁解析器，将界面恢复成原样
     *
     * @public
     */
    destroy() {
        this.tree = null;
    }
}
