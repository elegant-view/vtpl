/**
 * @file 事件
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {each, isClass, isFunction, slice} from './utils';

export default class Event {
    constructor() {
        this.evnts = {};
    }

    on(eventName, fn, context) {
        if (!isFunction(fn)) {
            return;
        }

        this.evnts[eventName] = this.evnts[eventName] || [];

        this.evnts[eventName].push({
            fn: fn,
            context: context
        });
    }

    trigger(eventName) {
        let fnObjs = this.evnts[eventName];
        if (fnObjs && fnObjs.length) {
            let args = slice(arguments, 1);
            each(fnObjs, function (fnObj) {
                fnObj.fn.apply(fnObj.context, args);
            });
        }
    }

    off(eventName, fn) {
        if (arguments.length === 0) {
            this.events = {};
        }

        if (!fn) {
            this.evnts[eventName] = null;
            return;
        }

        let fnObjs = this.evnts[eventName];
        if (fnObjs && fnObjs.length) {
            let newFnObjs = [];
            each(fnObjs, fnObj => {
                if (fn !== fnObj.fn) {
                    newFnObjs.push(fnObj);
                }
            });
            this.evnts[eventName] = newFnObjs;
        }
    }

    isAllRemoved() {
        let eventName;
        let fn;
        if (arguments.length === 0 || arguments.length > 2) {
            throw new TypeError('wrong arguments');
        }

        if (arguments.length >= 1 && isClass(arguments[0], 'String')) {
            eventName = arguments[0];
        }
        if (arguments.length === 2 && isFunction(arguments[1])) {
            fn = arguments[1];
        }

        let fnObjs = this.events[eventName];
        if (fnObjs && fnObjs.length) {
            if (fn) {
                for (let i = 0, il = fnObjs.length; i < il; ++i) {
                    let fnObj = fnObjs[i];
                    if (fnObj.fn === fn) {
                        return false;
                    }
                }
            }

            // 只传了eventName，没有传callback，存在eventName对应的回调函数
            return false;
        }

        return true;
    }
}
