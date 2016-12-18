/**
 * @file DOM 更新器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import OrderedProtectObject from 'protectobject/OrderedProtectObject';
import mixin from './decorators/mixin';
import StageTrait from './decorators/StageTrait';
import StateTrait from './decorators/StateTrait';

const TASKS = Symbol('tasks');
const COUNTER = Symbol('counter');
const NODE_ATTR_NAME_TASK_ID_MAP = Symbol('nodeAttrNameTaskIdMap');
const EXECUTE = Symbol('execute');

const requestAnimationFrame = getRequestAnimationFrameFn().bind(window);

function getRequestAnimationFrameFn() {
    let requestAnimationFrame;
    if (window.requestAnimationFrame) {
        requestAnimationFrame = window.requestAnimationFrame;
    }
    else if (window.webkitRequestAnimationFrame) {
        requestAnimationFrame = window.webkitRequestAnimationFrame;
    }

    if (requestAnimationFrame) {
        return function (fn) {
            requestAnimationFrame(fn);
        };
    }

    return function (fn) {
        setTimeout(fn, 16);
    };
}

@mixin(StageTrait, StateTrait)
export default class DomUpdater {

    /**
     * constructor
     *
     * @public
     */
    constructor() {
        // 为啥这里要用ProtectObject呢？
        // 因为在taskFn或者notifyFn里面有可能间接修改tasks，这就容易引起错误了，思考如下场景：
        // 假设现在有taskId为2的任务添加进来了，然后在任务执行过程中，又添加taskId为2的任务，此时如果直接操作tasks，
        // 那么后面的this[TASKS][taskId]=null就会沉默掉后面这个任务，所以这个时候，应该把这个task缓存一下，等待当前
        // requestAnimationFrame执行完之后再添加进去。
        //
        // 综上考虑，在requestAnimationFrame执行过程中，this[TASKS]应该处于被锁的状态，不能对其进行操作。
        this[TASKS] = new OrderedProtectObject();
        this[COUNTER] = 0;
        this[NODE_ATTR_NAME_TASK_ID_MAP] = {};
    }

    /**
     * 生成任务ID。
     * 为啥会有任务ID呢？
     * 因为此处存在这样一种策略：
     * 如果两个任务的ID是一样的，那么认为是同一个性质的任务，后面的任务将会覆盖掉前面的任务。
     *
     * 比如，在设置DOM元素节点的title属性的时候，第一次设置为`zhangsan`，第二次设置为`lisi`，
     * 如果这两次设置操作是在某一次批量操作中进行的，那么第一次设置完全可以抛弃，直接将title设置为`lisi`。
     *
     * @public
     * @return {number} 任务ID号
     */
    generateTaskId() {
        return ++this[COUNTER];
    }

    /**
     * 对于DOM元素的属性更新，提供一种更方便的获取任务ID的方法
     *
     * @public
     * @param  {vtpl/src/nodes/Node} node     节点对象
     * @param  {string} attrName 要设置的属性名称
     * @return {number}          任务ID
     */
    generateNodeAttrUpdateId(node, attrName) {
        const key = node.getNodeId() + '-' + attrName;
        if (!this[NODE_ATTR_NAME_TASK_ID_MAP][key]) {
            this[NODE_ATTR_NAME_TASK_ID_MAP][key] = this.generateTaskId();
        }

        return this[NODE_ATTR_NAME_TASK_ID_MAP][key];
    }

    /**
     * 将任务添加至队列，等待执行。理论上来说，任务函数里面不能存在异步操作。
     * 此处会传入两种函数：
     * 1、任务函数，用于执行具体的任务，比如DOM操作；
     * 2、任务执行完成之后的回调函数。
     *
     * 对于任务函数，可能会存在被覆盖的情况，比如后面的DOM操作和前面的DOM操作处理同样的属性。
     * 而对于回调函数，我们不期望其被覆盖，因为要保证通知到调用者：该任务已经结束了（无论是因为执行掉了还是被覆盖掉了，都认为是结束了）。
     *
     * 这样一来，回调函数应该存成一个数组。
     *
     * @public
     * @param {number} taskId 任务ID
     * @param {function()} taskFn 任务函数
     * @param {function(Error, *)=} notifyFn 执行结果的回调函数
     */
    addTaskFn(taskId, taskFn, notifyFn) {
        const task = this[TASKS].get(taskId) || {};

        task.taskFn = taskFn;

        task.notifyFns = task.notifyFns || [];
        notifyFn && task.notifyFns.push(notifyFn);

        this[TASKS].set('' + taskId, task);
    }

    /**
     * 销毁
     *
     * @public
     */
    destroy() {
        // TASKS 为假值是当前对象已被销毁的标志
        if (!this[TASKS]) {
            return;
        }

        this.stop();
        this[TASKS].destroy();

        this[TASKS] = null;
        this[NODE_ATTR_NAME_TASK_ID_MAP] = null;
    }

    /**
     * 停止执行任务
     *
     * @public
     */
    stop() {
        this.removeState('executing');
    }

    /**
     * 开始监控并执行任务队列中的任务
     *
     * @public
     */
    start() {
        if (this.hasState('executing')) {
            return;
        }

        this.addState('executing');
        this[EXECUTE]();
    }

    /**
     * execute
     *
     * @private
     */
    [EXECUTE]() {
        if (!this.hasState('executing')) {
            return;
        }

        requestAnimationFrame(() => {

            // 避免在调用 [EXECUTE]() 之后，马上调用 stop() 所造成的错误
            if (!this.hasState('executing')) {
                return;
            }

            // console.time('requestAnimationFrame');
            // let counter = 0;
            this[TASKS].safeIterate((task, taskId) => {
                // counter++;
                if (!task) {
                    return;
                }

                let error;
                let result;
                try {
                    result = task.taskFn();
                }
                catch (err) {
                    error = err;
                }
                for (let i = 0, il = task.notifyFns.length; i < il; ++i) {
                    task.notifyFns[i](error, result);
                }

                // 太尴尬了，有可能在 task.fn 里面 stop 了
                if (!this.hasState('executing')) {
                    return true;
                }
            });
            // if (counter) {
            //     console.log(counter);
            //     console.timeEnd('requestAnimationFrame');
            // }

            this[EXECUTE]();
        });
    }
}
