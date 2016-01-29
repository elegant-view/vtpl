/**
 * @file 解析器的抽象基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Base from '../Base';
import parserState from './parserState';

class Parser extends Base {
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
     * 脏检测。默认会使用全等判断。
     *
     * @public
     * @param  {string} expr         要检查的表达式
     * @param  {*} exprValue    表达式当前计算出来的值
     * @param  {*} exprOldValue 表达式上一次计算出来的值
     * @return {boolean}              两次的值是否相同
     */
    dirtyCheck(expr, exprValue, exprOldValue) {
        let dirtyChecker = this.tree.getTreeVar('dirtyChecker');
        let dirtyCheckerFn = dirtyChecker ? dirtyChecker.getChecker(expr) : null;
        return (dirtyCheckerFn && dirtyCheckerFn(expr, exprValue, exprOldValue))
                || (!dirtyCheckerFn && exprValue !== exprOldValue);
    }

    /**
     * 销毁解析器，将界面恢复成原样
     *
     * @public
     */
    destroy() {
        this.tree = null;
    }
}

export default Parser;
