/**
 * @file 事件
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {isClass, isFunction, slice, forEach} from './utils';

export default class Event {
    constructor() {
        this.evnts = {};
    }

    on(eventName, fn, context) {
        if (!isFunction(fn)) {
            return;
        }

        this.evnts[eventName] = this.evnts[eventName] || [];

        this.evnts[eventName].push({fn, context});
    }

    trigger(eventName) {
        let fnObjs = this.evnts[eventName];
        if (fnObjs && fnObjs.length) {
            let args = slice(arguments, 1);

            // 这个地方现在不处理事件回调队列污染的问题了，
            // 因为对于本库来说，收效甚微，同时可以在另外的地方解决掉由此带来的bug
            forEach(fnObjs, fnObj => this.invokeEventHandler(fnObj, ...args));
        }
    }

    invokeEventHandler(handler, ...args) {
        return handler.fn.apply(handler.context, args);
    }

    getEventHandlers(eventName) {
        return this.evnts[eventName];
    }

    off(eventName, fn) {
        if (arguments.length === 0) {
            this.evnts = {};
        }

        if (!fn) {
            this.evnts[eventName] = null;
            return;
        }

        let fnObjs = this.evnts[eventName];
        if (fnObjs && fnObjs.length) {
            let newFnObjs = [];
            forEach(fnObjs, fnObj => {
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

        let fnObjs = this.evnts[eventName];
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
