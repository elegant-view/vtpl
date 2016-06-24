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
     * @param  {...*} ...args   参数，最后一个可以是一个回调函数
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
                event.set(eventName, handlers);
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

    off(...args) {
        if (this.getEvent()) {
            super.off(...args);
        }
    }

    destroy() {
        if (this.getEvent()) {
            super.destroy();
        }
    }
}
