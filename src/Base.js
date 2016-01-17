/**
 * @file 所有类的基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import inherit from './inherit';
import {extend} from './utils';

function Base() {
    this.initialize.apply(this, arguments);
}

Base.prototype.initialize = function () {};

/**
 * 继承
 *
 * @static
 * @param  {Object} props       普通属性
 * @param  {Object} staticProps 静态属性
 * @return {Class}             子类
 */
Base.extends = function (props, staticProps) {
    var baseCls = this;

    staticProps = extend({}, staticProps);

    // 每个类都必须有一个名字
    if (!staticProps.$name) {
        throw new SyntaxError('each class must have a `$name`.');
    }

    var cls = function () {
        baseCls.apply(this, arguments);
    };
    extend(cls.prototype, props);
    extend(cls, staticProps);

    // 记录一下父类
    cls.$superClass = baseCls;

    return inherit(cls, baseCls);
};

Base.trait = function (props) {
    var proto = this.prototype;
    for (var key in props) {
        proto[key] = props[key];
    }

    return this;
};

export default Base;
