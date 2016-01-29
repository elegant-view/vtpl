/**
 * @file 一堆项目里面常用的方法
 * @author yibuyisheng(yibuyisheng@163.com)
 */

export function slice(arr, start, end) {
    return Array.prototype.slice.call(arr, start, end);
}

/**
 * 超级简单的 extend ，因为本库对 extend 没那高的要求，
 * 等到有要求的时候再完善。
 *
 * @inner
 * @param  {Object} target 目标对象
 * @return {Object}        最终合并后的对象
 */
export function extend(target) {
    var srcs = slice(arguments, 1);
    for (var i = 0, il = srcs.length; i < il; i++) {
        /* eslint-disable guard-for-in */
        for (var key in srcs[i]) {
            target[key] = srcs[i][key];
        }
        /* eslint-enable guard-for-in */
    }
    return target;
}

export function each(arr, fn, context) {
    if (isArray(arr)) {
        for (var i = 0, il = arr.length; i < il; i++) {
            if (fn.call(context, arr[i], i, arr)) {
                break;
            }
        }
    }
    else if (typeof arr === 'object') {
        for (var k in arr) {
            if (fn.call(context, arr[k], k, arr)) {
                break;
            }
        }
    }
}

export function forEach(arr, fn, context) {
    /* eslint-disable guard-for-in */
    for (let i in arr) {
    /* eslint-enable guard-for-in */
        fn.call(context, arr[i], i, arr);
    }
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
    if (!isClass(obj, 'Object')) {
        return false;
    }

    for (var k in obj) {
        if (!obj.hasOwnProperty(k)) {
            return false;
        }
    }

    return true;
}

export function bind(fn, thisArg) {
    if (!isFunction(fn)) {
        return;
    }

    let bind = Function.prototype.bind || function () {
        let args = arguments;
        let obj = args.length > 0 ? args[0] : undefined;
        let me = this;
        return function () {
            let totalArgs = Array.prototype.concat.apply(Array.prototype.slice.call(args, 1), arguments);
            return me.apply(obj, totalArgs);
        };
    };
    return bind.apply(fn, [thisArg].concat(Array.prototype.slice.call(arguments, 2)));
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
 * @public
 * @param  {string} str 要转换的字符串
 * @return {string}
 */
export function line2camel(str) {
    return str.replace(/-[a-z]/g, function (matched) {
        return matched[1].toUpperCase();
    });
}

export function distinctArr(arr, hashFn) {
    hashFn = isFunction(hashFn) ? hashFn : function (elem) {
        return String(elem);
    };
    var obj = {};
    for (var i = 0, il = arr.length; i < il; ++i) {
        obj[hashFn(arr[i])] = arr[i];
    }

    var ret = [];
    for (var key in obj) {
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
