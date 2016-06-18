/**
 * @file 具备隐藏状态的基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Base from './Base';

const IS_DARK = Symbol('isDark');

export default class DarkEntity extends Base {

    constructor(...args) {
        super(...args);

        this[IS_DARK] = false;
    }

    /**
     * 隐藏当前实体
     *
     * @public
     * @abstract
     * @param {function()} done 完成异步操作的回调函数
     */
    goDark(done) {
        if (this[IS_DARK]) {
            done(false);
            return;
        }

        this[IS_DARK] = true;
        done(true);
    }

    /**
     * 显示当前实体
     *
     * @public
     * @abstract
     * @param {function()} done 完成异步操作的回调函数
     */
    restoreFromDark(done) {
        if (!this[IS_DARK]) {
            done(false);
            return;
        }

        this[IS_DARK] = false;
        done(true);
    }

    get isDark() {
        return this[IS_DARK];
    }
}
