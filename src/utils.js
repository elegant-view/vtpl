/**
 * @file 一堆项目里面常用的方法
 * @author yibuyisheng(yibuyisheng@163.com)
 */

/**
 * 超级简单的 extend ，因为本库对 extend 没那高的要求，
 * 等到有要求的时候再完善。
 *
 * @param  {Object} target 目标对象
 * @param  {...<Object>} srcs 源对象数组
 * @return {Object}        最终合并后的对象
 */
export function extend(target, ...srcs) {
    for (let i = 0, il = srcs.length; i < il; i++) {
        for (let key in srcs[i]) {
            if (srcs[i].hasOwnProperty(key)) {
                target[key] = srcs[i][key];
            }
        }
    }
    return target;
}

export function isClass(obj, clsName) {
    return Object.prototype.toString.call(obj) === '[object ' + clsName + ']';
}

export function isArray(arr) {
    return isClass(arr, 'Array');
}

export function isNumber(obj) {
    return isClass(obj, 'Number');
}

export function isFunction(obj) {
    return isClass(obj, 'Function');
}

export function getClassNameOf(obj) {
    return Object.prototype.toString.call(obj).match(/\[object (\w+)\]/)[1];
}

/**
 * 是否是一个纯对象，满足如下条件：
 *
 * 1、除了内置属性之外，没有其他继承属性；
 * 2、constructor 是 Object
 *
 * @param {Any} obj 待判断的变量
 * @return {boolean}
 */
export function isPureObject(obj) {
    return typeof obj === 'object'
        && obj !== null
        && Object.getPrototypeOf(obj).constructor === Object;
}

export function isSubClassOf(SubClass, SuperClass) {
    return SubClass.prototype instanceof SuperClass;
}

/**
 * 对传入的字符串进行创建正则表达式之前的转义，防止字符串中的一些字符成为关键字。
 *
 * @param  {string} str 待转义的字符串
 * @return {string}     转义之后的字符串
 */
export function regExpEncode(str) {
    return '\\' + str.split('').join('\\');
}

/**
 * 将字符串中的驼峰命名方式改为短横线的形式
 *
 * @public
 * @param  {string} str 要转换的字符串
 * @return {string}
 */
export function camel2line(str) {
    return str.replace(/[A-Z]/g, function (matched, index) {
        if (index === 0) {
            return matched.toLowerCase();
        }
        return '-' + matched.toLowerCase();
    });
}

/**
 * 将字符串中的短横线命名方式改为驼峰的形式
 *
 * @param  {string} str 要转换的字符串
 * @return {string}
 */
export function line2camel(str) {
    return str.replace(/-[a-z]/g, function (matched) {
        return matched[1].toUpperCase();
    });
}

/**
 * 将数组里面的元素去重
 *
 * @param  {Array.<*>} arr    待去重的数组
 * @param  {function(*)} hashFn 计算数组每个元素的唯一标识
 * @return {Array.<*>}
 */
export function distinctArr(arr, hashFn) {
    hashFn = isFunction(hashFn) ? hashFn : function (elem) {
        return String(elem);
    };
    let obj = {};
    for (let i = 0, il = arr.length; i < il; ++i) {
        obj[hashFn(arr[i])] = arr[i];
    }

    let ret = [];
    for (let key in obj) {
        if (!obj.hasOwnProperty(key)) {
            continue;
        }

        ret.push(obj[key]);
    }

    return ret;
}

export function regExpEncode(str) {
    return '\\' + str.split('').join('\\');
}

export function type(obj) {
    return typeof obj;
}

export function empty() {}

export function isExpr(expr) {
    return /\$\{(.+?)}/.test(expr);
}

export function nextTick(fn) {
    setTimeout(fn);
}
