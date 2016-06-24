/**
 * @file Tree和Parser的基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

const IS_DESTROIED = Symbol('isDestroied');


export default class Base {
    constructor() {
        this[IS_DESTROIED] = false;
    }

    /**
     * 销毁对象
     *
     * @public
     */
    destroy() {
        if (!this[IS_DESTROIED]) {
            this.release();
            this[IS_DESTROIED] = true;
        }
    }

    /**
     * 在销毁对象的时候释放资源，子类应该实现这个方法。
     *
     * @protected
     */
    release() {

    }
}

Base.trait = function trait(props) {
    let proto = this.prototype;
    /* eslint-disable guard-for-in */
    for (let key in props) {
        proto[key] = props[key];
    }
    /* eslint-enable guard-for-in */

    return this;
};
