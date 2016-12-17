/**
 * @file mixin
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {extend} from '../utils';

export default function mixin(obj) {
    return function (Class) {
        extend(Class.prototype, obj);
    };
}
