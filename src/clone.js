/**
 * @file 对象拷贝，此处并不考虑宿主相关的对象、Symbol。
 *       只能克隆可遍历的属性。本克隆并不会重建被克隆对象的原型链结构。
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {getClassNameOf} from './utils';
import Data from './Data';

/**
 * 拷贝对象
 *
 * @param {*} value 要拷贝的
 * @param {number=} deep 拷贝的深度，默认全部拷贝
 * @param {function(*,Number):*} customizer.i.clone 克隆函数
 * @return {*}
 */
export default function (value, deep) {
    return clone(value, deep);
};


function clone(value, deep, clonedArray) {
    clonedArray = clonedArray || [];

    if (deep === undefined) {
        deep = Number.POSITIVE_INFINITY;
    }

    if (deep <= 0) {
        return value;
    }

    const typeOfValue = typeof value;

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

    const className = getClassNameOf(value);

    // 包装类型和日期
    if (className === 'Number'
        || className === 'Boolean'
        || className === 'String'
        || className === 'Date'
    ) {
        return new {Number, Boolean, String, Date}[className](value.valueOf());
    }

    if (className === 'Array') {
        let cloned = getCloned(value, clonedArray);
        if (cloned) {
            return cloned;
        }

        cloned = [];
        clonedArray.push({origin: value, cloned});
        for (let i = 0, il = value.length; i < il; ++i) {
            cloned.push(clone(value[i], deep - 1, clonedArray));
        }
        return cloned;
    }

    if (value instanceof Data) {
        return value.clone();
    }

    // 先看看这个value对象是不是已经克隆过了
    let cloned = getCloned(value, clonedArray);
    // 如果有，则直接返回之前的
    if (cloned) {
        return cloned;
    }

    // 遍历对象属性，所以此处只能克隆可枚举的属性
    cloned = {};
    clonedArray.push({origin: value, cloned});
    /* eslint-disable guard-for-in */
    for (let key in value) {
    /* eslint-enable guard-for-in */
        cloned[key] = clone(value[key], deep - 1, clonedArray);
    }

    return cloned;
}

function getCloned(value, clonedArray) {
    for (let i = 0, il = clonedArray.length; i < il; ++i) {
        if (clonedArray[i].origin === value) {
            return clonedArray[i].cloned;
        }
    }
}
