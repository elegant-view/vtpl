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

export default class DoneChecker {

    /**
     * 构造函数
     *
     * @public
     * @constructor
     * @param  {Function} onDone 完成所有异步函数之后的回调函数，complete方法也可以设置这个参数，并且具有较高优先级
     */
    constructor(onDone) {
        this[ASYN_FUNCTIONS] = [];
        this[TOTAL] = 0;
        this[COUNTER] = 0;
        this[STATE] = STATE_READY;
        this[ON_DONE] = isFunction(onDone) ? onDone : empty;

        // setTimeout(() => {
        //     throw new Error('-----');
        // }, 3000);
    }

    /**
     * 添加异步执行函数
     *
     * @public
     * @param {Function} asynFn 异步执行函数
     */
    add(asynFn) {
        if (this[STATE] !== STATE_READY) {
            throw new Error('wrong state');
        }

        if (!isFunction(asynFn)) {
            return;
        }
        ++this[TOTAL];
        this[ASYN_FUNCTIONS].push(asynFn);
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

    /**
     * 在异步函数添加完毕之后应该调用一下这个函数，以便说明total不再变化了。
     *
     * @public
     */
    complete() {
        if (this[STATE] !== STATE_READY) {
            throw new Error('wrong state');
        }

        this[STATE] = STATE_COMPLETE;
        if (this[TOTAL] === 0 || this[TOTAL] === this[COUNTER]) {
            this[STATE] = STATE_DONE;
            this[ON_DONE]();
        }
    }
}
