/**
 * @file 异步操作是否完成的检查器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {isFunction, nextTick, empty} from './utils';

const ASYN_FUNCTIONS = Symbol('asynFunctions');
const TOTAL = Symbol('total');
const COUNTER = Symbol('counter');
const ON_DONE = Symbol('onDone');

const STATE = Symbol('state');
const STATE_READY = Symbol('stateReady');
const STATE_DONE = Symbol('stateDone');
const STATE_COMPLETE = Symbol('stateComplete');

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
            if (this[COUNTER] === this[TOTAL]) {
                // 一般情况下是因为没有调用complete方法
                if (this[STATE] !== STATE_COMPLETE) {
                    throw new Error('wrong state');
                }

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
        if (this[TOTAL] === 0) {
            nextTick(() => {
                this[STATE] = this[STATE_DONE];
                this[ON_DONE]();
            });
        }
    }
}
