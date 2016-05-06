/**
 * @file 异步操作是否完成的检查器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {isFunction, empty} from './utils';

const ASYN_FUNCTIONS = Symbol('asynFunctions');
const TOTAL = Symbol('total');
const COUNTER = Symbol('counter');
const ON_DONE = Symbol('onDone');

const STATE = Symbol('state');
const STATE_READY = Symbol('stateReady');
const STATE_DONE = Symbol('stateDone');
const STATE_COMPLETE = Symbol('stateComplete');

const CHECK = Symbol('check');

export default class DoneChecker {
    constructor(onDone) {
        this[ASYN_FUNCTIONS] = [];
        this[TOTAL] = 0;
        this[COUNTER] = 0;
        this[STATE] = STATE_READY;
        this[ON_DONE] = isFunction(onDone) ? onDone : empty;
    }

    add(asynFn) {
        if (this[STATE] !== STATE_READY) {
            throw new Error('wrong state');
        }

        if (!isFunction(asynFn)) {
            return;
        }
        ++this[TOTAL];
        asynFn(() => {
            ++this[COUNTER];

            if (this[STATE] === STATE_DONE) {
                throw new Error('wrong state');
            }

            // 如果还没调用complete方法，那么就不要检查了。
            // 只有回调是同步的情况，才会进入到这个分支
            if (this[STATE] === STATE_READY) {
                return;
            }

            if (this[COUNTER] === this[TOTAL]) {
                this[STATE] = STATE_DONE;
                this[ON_DONE]();
            }
        });
    }

    // 在异步函数添加完毕之后应该调用一下这个函数，以便说明total不再变化了。
    complete() {
        if (this[STATE] !== STATE_READY) {
            throw new Error('wrong state');
        }

        this[STATE] = STATE_COMPLETE;
        if (this[TOTAL] === 0 || this[TOTAL] === this[COUNTER]) {
            this[STATE] = this[STATE_DONE];
            this[ON_DONE]();
        }
    }
}
