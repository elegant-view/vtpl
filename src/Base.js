/**
 * @file Tree和Parser的基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import State, {ensureStates, not} from 'state/State';

export default class Base extends State {
    constructor() {
        super();
    }

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

    /**
     * 在销毁对象的时候释放资源，子类应该实现这个方法。
     *
     * @protected
     */
    release() {}
}
