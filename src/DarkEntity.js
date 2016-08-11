/**
 * @file 具备隐藏状态的基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Base from './Base';
import DoneChecker from './DoneChecker';

/**
 * DarkEntity
 *
 * @class
 * @extends {Base}
 */
export default class DarkEntity extends Base {

    /**
     * constructor
     *
     * @public
     */
    constructor() {
        super();
    }

    /**
     * 隐藏当前实体
     *
     * @public
     * @final
     * @param {Function} done 完成异步操作的回调函数
     */
    goDark(done) {
        const doneChecker = new DoneChecker(done);
        if (!this.hasState('dark')) {
            doneChecker.add(::this.hide);
            this.addState('dark');
        }
        doneChecker.complete();
    }

    /**
     * 隐藏
     *
     * @protected
     * @abstract
     * @param {Function} done 执行完的回调函数
     */
    hide(done) {
        done();
    }

    /**
     * 显示当前实体
     *
     * @public
     * @final
     * @param {Function} done 完成异步操作的回调函数
     */
    restoreFromDark(done) {
        const doneChecker = new DoneChecker(done);
        if (this.hasState('dark')) {
            doneChecker.add(::this.show);
            this.removeState('dark');
        }
        doneChecker.complete();
    }

    /**
     * 显示
     *
     * @protected
     * @abstract
     * @param {Function} done 执行完的回调函数
     */
    show(done) {
        done();
    }

    /**
     * 当前是否处于隐藏状态
     *
     * @public
     * @return {boolean}
     */
    get isDark() {
        return this.hasState('dark');
    }
}
