/**
 * @file 事件
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {isClass, isFunction} from './utils';
import DoneChecker from './DoneChecker';

const EVENTS = Symbol('events');

function empty() {}

export default class Event {
    constructor() {
        this[EVENTS] = {};
    }

    on(eventName, fn, context) {
        if (!isFunction(fn)) {
            return;
        }

        this[EVENTS][eventName] = this[EVENTS][eventName] || [];

        this[EVENTS][eventName].push({fn, context});
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

        let fnObjs = this[EVENTS][eventName];
        if (fnObjs && fnObjs.length) {
            let handlerArgs;
            if (doneFn === empty) {
                handlerArgs = args;
            }
            else {
                handlerArgs = args.slice(0, -1);
            }
            // 这个地方现在不处理事件回调队列污染的问题了，
            // 因为对于本库来说，收效甚微，同时可以在另外的地方解决掉由此带来的bug
            fnObjs.forEach(fnObj => {
                doneChecker.add(done => {
                    this.invokeEventHandler(fnObj, ...handlerArgs.concat(done));
                });
            });
        }

        doneChecker.complete();
    }

    invokeEventHandler(handler, ...args) {
        return handler.fn.apply(handler.context, args);
    }

    getEventHandlers(eventName) {
        return this[EVENTS][eventName];
    }

    off(...args) {
        if (!this[EVENTS]) {
            return;
        }

        let [eventName, fn, context] = args;
        if (args.length === 0) {
            this[EVENTS] = {};
        }

        let iterator = checkFn => {
            let fnObjs = this[EVENTS][eventName];
            if (fnObjs && fnObjs.length) {
                this[EVENTS][eventName] = fnObjs.filter(fnObj => checkFn(fnObj));
            }
        };

        if (args.length === 1) {
            this[EVENTS][eventName] = null;
        }
        else if (args.length === 2) {
            iterator(fnObj => fn !== fnObj.fn);
        }
        else if (args.length === 3) {
            iterator(fnObj => fn !== fnObj.fn || context !== fnObj.context);
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

        let fnObjs = this[EVENTS][eventName];
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

    destroy() {
        this[EVENTS] = null;
    }
}
