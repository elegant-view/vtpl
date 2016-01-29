/**
 * @file 对象拷贝
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {forEach, getClassNameOf} from 'utils';

/**
 * 拷贝对象
 *
 * @param {*} value 要拷贝的
 * @param {number=} deep 拷贝的深度，默认全部拷贝
 * @param {function(*,Number):*} customizer.i.clone 克隆函数
 * @return {*}
 */
export default function clone(value, deep) {
    if (deep === undefined) {
        deep = Number.POSITIVE_INFINITY;
    }

    let typeOfValue = typeof value;

    // 基本类型
    if (typeOfValue === 'undefined'
        || typeOfValue === 'boolean'
        || typeOfValue === 'string'
        || typeOfValue === 'number'
        // 不考虑Safari5、Chrome7之前`typeof [正则]`也是function的问题
        || typeOfValue === 'function'
        || value === null
    ) {
        return value;
    }

    let className = getClassNameOf(value);

    // 包装类型和日期
    if (className === 'Number'
        || className === 'Boolean'
        || className === 'String'
        || className === 'Date'
    ) {
        return new {Number, Boolean, String, Date}[className](value.valueOf());
    }

    if (className === 'Array') {
        let ret = [];
        forEach(value, item => {
            ret.push(clone(item, deep - 1));
        });
        return ret;
    }

    // 遍历对象属性，所以此处只能克隆可枚举的属性
    let ret = {};
    /* eslint-disable guard-for-in */
    for (let key in value) {
    /* eslint-enable guard-for-in */
        ret[key] = clone(value[key], deep - 1);
    }
    return ret;
}
