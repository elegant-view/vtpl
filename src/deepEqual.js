/**
 * @file 深比较
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {isClass, getClassNameOf} from './utils';
import Data from './Data';

function unwrap(value) {
    if (isClass(value, 'Number')
        || isClass(value, 'Boolean')
        || isClass(value, 'String')
        || isClass(value, 'Date')
    ) {
        return value.valueOf();
    }

    return value;
}

function isBaseType(value) {
    let typeOfValue = typeof value;
    return typeOfValue === 'undefined'
        || typeOfValue === 'boolean'
        || typeOfValue === 'string'
        || typeOfValue === 'number'
        || typeOfValue === 'function'
        || value === null
        || isClass(value, 'Number')
        || isClass(value, 'Boolean')
        || isClass(value, 'String')
        || isClass(value, 'Date');
}

function deepEqual(value1, value2, comparedArray = []) {

    // 基类型比较
    if (isBaseType(value1) || isBaseType(value2)) {
        return unwrap(value1) === unwrap(value2);
    }

    let className1 = getClassNameOf(value1);
    let className2 = getClassNameOf(value2);

    // 类型不同
    if (className1 !== className2) {
        return false;
    }

    if (className1 === 'Array') {
        if (value1.length !== value2.length) {
            return false;
        }

        if (isExistInComparedArray(value1, value2, comparedArray)) {
            return true;
        }

        comparedArray.push({value1, value2});
        for (let i = 0, il = value1.length; i < il; ++i) {
            if (!deepEqual(value1[i], value2[i], comparedArray)) {
                return false;
            }
        }

        return true;
    }

    if (value1 instanceof Data) {
        return value1.equals(value2);
    }

    if (isExistInComparedArray(value1, value2, comparedArray)) {
        return true;
    }
    comparedArray.push({value1, value2});

    /* eslint-disable guard-for-in */
    const keys = {};
    /* eslint-disable fecs-use-for-of */
    for (let key in value1) {
        keys[key] = true;
    }
    for (let key in value2) {
        keys[key] = true;
    }
    /* eslint-enabel fecs-use-for-of */

    /* eslint-disable fecs-use-for-of */
    /* eslint-disable fecs-valid-map-set */
    for (let key in keys) {
        if (value1[key] !== value2[key]
            && !deepEqual(value1[key], value2[key], comparedArray)
        ) {
            return false;
        }
    }
    /* eslint-enable fecs-valid-map-set */
    /* eslint-enable fecs-use-for-of */
    return true;
    /* eslint-enable guard-for-in */
}

function isExistInComparedArray(value1, value2, comparedArray) {
    for (let i = 0, il = comparedArray.length; i < il; ++i) {
        if (comparedArray[i].value1 === value1 && comparedArray[i].value2 === value2) {
            return true;
        }
    }

    return false;
}

export default function (value1, value2) {
    return deepEqual(value1, value2);
}
