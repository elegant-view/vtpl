/**
 * @file Tree和Parser的基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import mixin from './decorators/mixin';
import StateTrait from './decorators/StateTrait';

/**
 * Base
 *
 * @class
 * @extends {State}
 */
@mixin(StateTrait)
export default class Base {

    /**
     * constructor
     *
     * @public
     */
    constructor() {}

    /* eslint-disable fecs-valid-class-jsdoc */
    /**
     * 销毁对象
     *
     * @public
     */
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
