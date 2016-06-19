/**
 * @file 事件
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {isClass, isFunction} from './utils';
import DoneChecker from './DoneChecker';
import ProtectObject from './ProtectObject';

const EVENTS = Symbol('events');

function empty() {}

export default class Event {
    constructor() {
        this[EVENTS] = new ProtectObject();
    }

    on(eventName, fn, context) {
        if (!isFunction(fn)) {
            return;
        }

        const eventHandlers = this[EVENTS].get(eventName) || [];
        eventHandlers.push({fn, context});
        this[EVENTS].set(eventName, eventHandlers);
    }

    trigger(eventName, ...args) {
        let doneFn = args[args.length - 1];
        doneFn = isFunction(doneFn) ? doneFn : empty;

        const doneChecker = new DoneChecker(doneFn);
        // 已经被销毁掉了，不再触发事件
        if (!this[EVENTS]) {
            doneChecker.complete();
            return;
        }

        const eventHandlers = this[EVENTS].get(eventName);
        if (eventHandlers && eventHandlers.length) {
            let handlerArgs;
            if (doneFn === empty) {
                handlerArgs = args;
            }
            else {
                handlerArgs = args.slice(0, -1);
            }

            this[EVENTS].safeExecute(() => {
                eventHandlers.forEach(handler => {
                    doneChecker.add(done => {
                        this.invokeEventHandler(handler, ...handlerArgs.concat(done));
                    });
                });
                this[EVENTS].set(eventName, eventHandlers);
            });
        }

        doneChecker.complete();
    }

    invokeEventHandler(handler, ...args) {
        return handler.fn.apply(handler.context, args);
    }

    getEventHandlers(eventName) {
        return this[EVENTS].get(eventName);
    }

    off(...args) {
        if (!this[EVENTS]) {
            return;
        }

        let [eventName, fn, context] = args;
        if (args.length === 0) {
            this[EVENTS] = new ProtectObject();
        }

        const iterator = checkFn => {
            let eventHandlers = this[EVENTS].get(eventName);
            if (eventHandlers && eventHandlers.length) {
                this[EVENTS][eventName] = eventHandlers.filter(handler => checkFn(handler));
            }
        };

        if (args.length === 1) {
            this[EVENTS].set(eventName, null);
        }
        else if (args.length === 2) {
            iterator(handler => fn !== handler.fn);
        }
        else if (args.length === 3) {
            iterator(handler => fn !== handler.fn || context !== handler.context);
        }
    }

    isAllRemoved(...args) {
        let eventName;
        let fn;
        if (args.length === 0 || args.length > 2) {
            throw new TypeError('wrong arguments');
        }

        if (args.length >= 1 && isClass(args[0], 'String')) {
            eventName = args[0];
        }
        if (args.length === 2 && isFunction(args[1])) {
            fn = args[1];
        }

        const eventHandlers = this[EVENTS].get(eventName);
        if (eventHandlers && eventHandlers.length) {
            if (fn) {
                for (let i = 0, il = eventHandlers.length; i < il; ++i) {
                    const handler = eventHandlers[i];
                    if (handler.fn === fn) {
                        return false;
                    }
                }
            }

            // 只传了eventName，没有传callback，存在eventName对应的回调函数
            return false;
        }

        return true;
    }

    destroy() {
        this[EVENTS] = null;
    }
}
