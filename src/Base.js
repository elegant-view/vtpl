/**
 * @file 所有类的基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

export default class Base {
    constructor() {}
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
