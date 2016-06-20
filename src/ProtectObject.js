/**
 * @file 保护对象，主要提供了锁定和解锁对象的功能
 * @author yibuyisheng(yibuyisheng@163.com)
 */

const OBJECT = Symbol('object');
const OBJECT_CACHE = Symbol('objectCache');
const IS_LOCKED = Symbol('isLocked');
const LOCK = Symbol('lock');
const UNLOCK = Symbol('unlock');

export default class ProtectObject {
    constructor() {
        this[OBJECT] = {};
        this[OBJECT_CACHE] = {};

        this[IS_LOCKED] = false;
    }

    /**
     * 判断是否锁定
     *
     * @protected
     * @return {boolean} 是否锁定
     */
    isLocked() {
        return this[IS_LOCKED];
    }

    /**
     * 锁定
     *
     * @protected
     */
    lock() {
        this[LOCK]();
    }

    /**
     * 解锁
     *
     * @protected
     */
    unlock() {
        this[UNLOCK]();
    }

    /**
     * 设置属性，如果被锁定的话，就先存储在缓存对象上面。
     *
     * @public
     * @param {string} key   属性名
     * @param {*} value 属性值
     */
    set(key, value) {
        const obj = this[IS_LOCKED] ? this[OBJECT_CACHE] : this[OBJECT];
        obj[key] = value;
    }

    /**
     * 获取属性值，如果被锁定的话，获取的会是缓存上面的值。
     *
     * @public
     * @param  {string} key 属性名
     * @return {*}     属性值
     */
    get(key) {
        return this[IS_LOCKED] ? this[OBJECT_CACHE][key] : this[OBJECT][key];
    }

    /**
     * 迭代对象，该迭代会锁定对象，迭代过程中一切对对象的操作（fn中的同步操作），都会作用于缓存对象。
     * 在迭代结束之后，缓存对象上面的属性会转移到对象上面去，并且缓存对象会置空。
     *
     * @public
     * @param  {Function} fn      迭代回调函数
     * @param  {*}   context 回调函数上下文
     */
    safeIterate(fn, context) {
        if (!fn) {
            return;
        }

        this[LOCK]();
        /* eslint-disable guard-for-in */
        for (let key in this[OBJECT]) {
        /* eslint-enable guard-for-in */
            const result = fn.call(context, this[OBJECT][key], key);
            if (result) {
                break;
            }
        }
        this[UNLOCK]();
    }

    [LOCK]() {
        this[IS_LOCKED] = true;
    }

    [UNLOCK]() {
        this[IS_LOCKED] = false;

        this[OBJECT] = this[OBJECT_CACHE];
        this[OBJECT_CACHE] = {};
    }

    safeExecute(fn, context) {
        if (!fn) {
            return;
        }

        this[LOCK]();
        fn.call(context);
        this[UNLOCK]();
    }

    /**
     * 销毁
     *
     * @public
     */
    destroy() {
        this[OBJECT] = {};
        this[OBJECT_CACHE] = {};
    }
}
