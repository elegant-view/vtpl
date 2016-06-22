/**
 * @file 事件
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import * as util from './utils';
import ProtectObject from 'ProtectObject/ProtectObject';
import DoneChecker from './DoneChecker';

const EVENT = Symbol('events');

export default class Event {
    constructor() {
        this[EVENT] = new ProtectObject();
    }

    /**
     * 绑定事件
     *
     * @public
     * @param  {string}   eventName 事件名字
     * @param  {Function} fn        回调函数
     * @param  {Object=}   context   上下文对象
     */
    on(eventName, fn, context) {
        if (!util.isFunction(fn)) {
            return;
        }

        const handlers = this[EVENT].get(eventName) || [];
        handlers.push({fn, context});
        this[EVENT].set(eventName, handlers);
    }

    trigger(eventName, ...args) {
        const handlers = this[EVENT].get(eventName);
        if (handlers) {
            this[EVENT].safeExecute(() => {
                this[EVENT].set(eventName, handlers);
                for (let i = 0, il = handlers.length; i < il; ++i) {
                    const handler = handlers[i];
                    handler.fn.apply(handler.context, args);
                }
            });
        }
    }

    triggerWithDone(eventName, ...args) {
        const done = args[args.length - 1];
        if (!util.isFunction(done)) {
            throw new TypeError('no `done` function');
        }

        const doneChecker = new DoneChecker(done);

        const handlers = this[EVENT].get(eventName);
        if (handlers) {
            this[EVENT].safeExecute(() => {
                const handlerArgs = args.slice(0, -1);
                this[EVENT].set(eventName, handlers);
                for (let i = 0, il = handlers.length; i < il; ++i) {
                    const handler = handlers[i];
                    addToDoneChecker(handler, handlerArgs);
                }
            });
        }

        doneChecker.complete();

        function addToDoneChecker(handler, handlerArgs) {
            doneChecker.add(checkerDone => {
                handler.fn.apply(handler.context, handlerArgs.concat(checkerDone));
            });
        }
    }

    /**
     * 移除事件回调
     *
     * @public
     * @param  {string=} eventName 参数名字
     * @param  {function=} fn 回调函数
     * @param  {Object=} context 上下文对象
     */
    off(eventName, fn, context) {
        // 已经被销毁
        if (!this[EVENT]) {
            return;
        }

        if (!eventName) {
            this[EVENT].destroy();
            this[EVENT] = new ProtectObject();
            return;
        }

        const iterator = checkFn => {
            const handlers = this[EVENT].get(eventName);
            const newHandlers = [];
            for (let i = 0, il = handlers.length; i < il; ++i) {
                if (checkFn(handlers[i])) {
                    newHandlers.push(handlers[i]);
                }
            }
            this[EVENT].set(eventName, newHandlers);
        };

        if (eventName && fn !== undefined) {
            this[EVENT].set(eventName, null);
        }
        else if (eventName && fn && context !== undefined) {
            iterator(handler => fn !== handler.fn);
        }
        else if (eventName && fn && context) {
            iterator(handler => fn !== handler.fn || context !== handler.context);
        }
    }

    destroy() {
        this[EVENT] = null;
    }
}
