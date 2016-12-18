/**
 * @file state trait
 * @author yibuyisheng(yibuyisheng@163.com)
 */

const STATE = Symbol('state');

export default {

    /**
     * 添加状态
     *
     * @public
     * @param {string|Symbol} state 状态字符串或者Symbol对象
     */
    addState(state) {
        this[STATE] = this[STATE] || {};
        this[STATE][state] = true;
    },

    /**
     * 判断当前是否具有state状态
     *
     * @public
     * @param  {string|Symbol}  state 状态字符串或者Symbol对象
     * @return {boolean}
     */
    hasState(state) {
        this[STATE] = this[STATE] || {};
        return !!this[STATE][state];
    },

    /**
     * 移除状态
     *
     * @public
     * @param  {string|Symbol} state 状态字符串或者Symbol对象
     */
    removeState(state) {
        this[STATE] = this[STATE] || {};
        this[STATE][state] = false;
    },

    /**
     * 清除
     *
     * @protected
     */
    clearState() {
        this[STATE] = {};
    }
};
