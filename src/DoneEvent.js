/**
 * @file 事件
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import * as util from './utils';
import DoneChecker from './DoneChecker';
import Event from 'event/Event';

export default class DoneEvent extends Event {

    /**
     * 支持complete回调
     *
     * @public
     * @param  {string} eventName 要触发的事件名字
     * @param  {...Array} ...args   参数，最后一个可以是一个回调函数
     */
    triggerWithDone(eventName, ...args) {
        const done = args[args.length - 1];
        if (!util.isFunction(done)) {
            throw new TypeError('no `done` function');
        }

        const doneChecker = new DoneChecker(done);

        const event = this.getEvent();
        const handlers = event.get(eventName);
        if (handlers) {
            event.safeExecute(() => {
                const handlerArgs = args.slice(0, -1);
                for (let i = 0, il = handlers.length; i < il; ++i) {
                    const handler = handlers[i];
                    addToDoneChecker(handler, handlerArgs);
                }
            }, null, true);
        }

        doneChecker.complete();

        function addToDoneChecker(handler, handlerArgs) {
            doneChecker.add(checkerDone => {
                handler.fn.apply(handler.context, handlerArgs.concat(checkerDone));
            });
        }
    }

    off(...args) {
        if (this.getEvent()) {
            super.off(...args);
        }
    }

    isAllRemoved(...args) {
        let eventName;
        let fn;
        if (args.length === 0 || args.length > 2) {
            throw new TypeError('wrong arguments');
        }

        if (args.length >= 1 && util.isClass(args[0], 'String')) {
            eventName = args[0];
        }
        if (args.length === 2 && util.isFunction(args[1])) {
            fn = args[1];
        }

        const eventHandlers = this.getEvent().get(eventName);
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
        if (this.getEvent()) {
            super.destroy();
        }
    }
}
