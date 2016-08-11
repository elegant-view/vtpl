/**
 * @file Tree和Parser的基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import State, {ensureStates, not} from 'state/State';

/**
 * Base
 *
 * @class
 * @extends {State}
 */
export default class Base extends State {

    /**
     * constructor
     *
     * @public
     */
    constructor() {
        super();
    }

    /* eslint-disable fecs-valid-class-jsdoc */
    /**
     * 销毁对象
     *
     * @public
     */
    @ensureStates([not('destroied')])
    destroy() {
        this.release();
        this.addState('destroied');
    }
    /* eslint-enable fecs-valid-class-jsdoc */

    /**
     * 在销毁对象的时候释放资源，子类应该实现这个方法。
     *
     * @protected
     */
    release() {}
}
