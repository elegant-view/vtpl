/**
 * @file 所有类的基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

class Base {
    constructor() {}
}

Base.trait = function trait(props) {
    var proto = this.prototype;
    /* eslint-disable guard-for-in */
    for (var key in props) {
        proto[key] = props[key];
    }
    /* eslint-enable guard-for-in */

    return this;
};

export default Base;
