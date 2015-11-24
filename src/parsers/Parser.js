/**
 * @file 解析器的抽象基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

/**
 * 构造函数
 *
 * @constructor
 * @param {Object} options 配置参数，一般可能会有如下内容：
 *                         {
 *                             startNode: ...,
 *                             endNode: ...,
 *                             node: ...,
 *                             config: ...
 *                         }
 *                         具体是啥可以参加具体的子类
 */

var Base = require('../Base');
module.exports = Base.extends(
    {

        /**
         * 初始化
         *
         * @protected
         * @param {Object} options 来自于构造函数
         */
        initialize: function (options) {
            this.exprCalculater = options.exprCalculater;
            this.config = options.config;
            this.domUpdater = options.domUpdater;
            this.tree = options.tree;
        },

        /**
         * 绑定scope model
         *
         * @public
         * @param {ScopeModel} scopeModel scope model
         */
        setScope: function (scopeModel) {
            this.scopeModel = scopeModel;

            this.scopeModel.on('change', this.onChange, this);
            this.scopeModel.on('parentchange', this.onChange, this);
        },

        /**
         * model 发生变化的回调函数
         *
         * @protected
         */
        onChange: function () {
            this.domUpdater.execute();
        },

        /**
         * 获取scope model
         *
         * @public
         * @return {ScopeModel} scope model对象
         */
        getScope: function () {
            return this.scopeModel;
        },

        /**
         * 向scope model里面设置数据
         *
         * @public
         * @param {Object} data 要设置的数据
         */
        setData: function (data) {
            this.scopeModel.set(data);
        },

        /**
         * 隐藏当前parser实例相关的节点。具体子类实现
         *
         * @public
         * @abstract
         */
        goDark: function () {},

        /**
         * 显示相关元素
         *
         * @public
         * @abstract
         */
        restoreFromDark: function () {},

        /**
         * 获取解析器当前状态下的开始DOM节点。
         *
         * 由于有的解析器会将之前的节点移除掉，那么就会对遍历带来影响了，
         * 所以此处提供两个获取开始节点和结束节点的方法。
         *
         * @public
         * @return {Node} DOM节点对象
         */
        getStartNode: function () {
            return this.startNode;
        },

        /**
         * 获取解析器当前状态下的结束DOM节点
         *
         * @public
         * @return {Node} 节点对象
         */
        getEndNode: function () {
            return this.endNode;
        },

        /**
         * 搜集表达式，生成表达式函数和 DOM 更新函数。具体子类实现
         *
         * @abstract
         * @public
         */
        collectExprs: function () {},

        /**
         * 脏检测。默认会使用全等判断。
         *
         * @public
         * @param  {string} expr         要检查的表达式
         * @param  {*} exprValue    表达式当前计算出来的值
         * @param  {*} exprOldValue 表达式上一次计算出来的值
         * @return {boolean}              两次的值是否相同
         */
        dirtyCheck: function (expr, exprValue, exprOldValue) {
            var dirtyCheckerFn = this.dirtyChecker ? this.dirtyChecker.getChecker(expr) : null;
            return (dirtyCheckerFn && dirtyCheckerFn(expr, exprValue, exprOldValue))
                    || (!dirtyCheckerFn && exprValue !== exprOldValue);
        },

        /**
         * 设置脏检测器
         *
         * @public
         * @param {DirtyChecker} dirtyChecker 脏检测器
         */
        setDirtyChecker: function (dirtyChecker) {
            this.dirtyChecker = dirtyChecker;
        },

        /**
         * 销毁解析器，将界面恢复成原样
         *
         * @public
         */
        destroy: function () {
            this.exprCalculater = null;
            this.config = null;
            this.domUpdater = null;
            this.tree = null;
            this.dirtyChecker = null;
        }
    }
);
