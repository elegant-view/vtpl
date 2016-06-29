/**
 * @file 具备隐藏状态的基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Base from './Base';
import {ensureStates, not, has} from 'state/State';
import DoneChecker from './DoneChecker';

const IS_DARK = Symbol('isDark');

export default class DarkEntity extends Base {

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
     */
    show(done) {
        done();
    }

    get isDark() {
        return this.hasState('dark');
    }
}
