/**
 * @file 异步操作是否完成的检查器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {isFunction, empty} from './utils';
import mixin from './decorators/mixin';
import StageTrait from './decorators/StageTrait';

const ASYN_FUNCTIONS = Symbol('asynFunctions');
const TOTAL = Symbol('total');
const COUNTER = Symbol('counter');
const ON_DONE = Symbol('onDone');

const STAGE_READY = Symbol('stateReady');
const STAGE_DONE = Symbol('stateDone');
const STAGE_COMPLETE = Symbol('stateComplete');

/**
 * DoneChecker
 *
 * @class
 */
@mixin(StageTrait)
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
        this[ON_DONE] = isFunction(onDone) ? onDone : empty;

        this.restrictStageEnum([
            STAGE_READY,
            STAGE_DONE,
            STAGE_COMPLETE
        ]);
        this.setStage(STAGE_READY);
    }

    /**
     * 添加异步执行函数
     *
     * @public
     * @param {Function} asynFn 异步执行函数
     */
    add(asynFn) {
        if (!this.isInStage(STAGE_READY)) {
            throw new Error('wrong state');
        }

        if (!isFunction(asynFn)) {
            return;
        }
        ++this[TOTAL];
        this[ASYN_FUNCTIONS].push(asynFn);
        asynFn(() => {
            ++this[COUNTER];

            if (this.isInStage(STAGE_DONE)) {
                throw new Error('wrong state');
            }

            // 如果还没调用complete方法，那么就不要检查了。
            // 只有回调是同步的情况，才会进入到这个分支
            if (this.isInStage(STAGE_READY)) {
                return;
            }

            if (this[COUNTER] === this[TOTAL]) {
                this.setStage(STAGE_DONE);
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
        if (!this.isInStage(STAGE_READY)) {
            throw new Error('wrong state');
        }

        this.setStage(STAGE_COMPLETE);
        if (this[TOTAL] === 0 || this[TOTAL] === this[COUNTER]) {
            this.setStage(STAGE_DONE);
            this[ON_DONE]();
        }
    }
}
