/**
 * @file 所有类的基类
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var inherit = require('./inherit');
var utils = require('./utils');

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

    var cls = function () {
        baseCls.apply(this, arguments);
    };
    utils.extend(cls.prototype, props);
    utils.extend(cls, staticProps);

    return inherit(cls, baseCls);
};

module.exports = Base;
