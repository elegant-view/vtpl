/**
 * @file DOM 更新器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {empty} from './utils';

const TASKS = Symbol('tasks');
const COUNTER = Symbol('counter');
const NODE_ATTR_NAME_TASK_ID_MAP = Symbol('nodeAttrNameTaskIdMap');
const IS_EXECUTING = Symbol('isExecuting');
const EXECUTE = Symbol('execute');

const requestAnimationFrame = getRequestAnimationFrameFn();

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
        setTimeout(fn, 17);
    };
}

export default class DomUpdater {
    constructor() {
        this[TASKS] = {};
        this[COUNTER] = 0;
        this[NODE_ATTR_NAME_TASK_ID_MAP] = {};
        this[IS_EXECUTING] = false;
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
        return this[COUNTER]++;
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
        let key = node.getNodeId() + '-' + attrName;
        if (!this[NODE_ATTR_NAME_TASK_ID_MAP][key]) {
            this[NODE_ATTR_NAME_TASK_ID_MAP][key] = this.generateTaskId();
        }

        return this[NODE_ATTR_NAME_TASK_ID_MAP][key];
    }

    /**
     * 将任务添加至队列，等待执行。理论上来说，任务函数里面不能存在异步操作。
     * 注意：此处callback并不一定会调用到，因为当前设置的任务可能被后续任务覆盖掉而得不到执行的机会。
     *
     * @public
     * @param {number} taskId 任务ID
     * @param {function()} taskFn 任务函数
     * @param {function(Error, *)=} callback 执行结果的回调函数
     */
    addTaskFn(taskId, taskFn, callback) {
        const preTask = this[TASKS][taskId];
        const notifyFn = () => {
            preTask && preTask.notifyFn();
            (callback || empty)();
        };
        this[TASKS][taskId] = {
            fn: taskFn,
            notifyFn
        };

        this[EXECUTE]();
    }

    /**
     * 销毁
     *
     * @public
     */
    destroy() {
        this.stop();
        this[TASKS] = null;
        this[NODE_ATTR_NAME_TASK_ID_MAP] = null;
    }

    /**
     * 停止执行任务
     *
     * @public
     */
    stop() {
        this[IS_EXECUTING] = false;
    }

    /**
     * 开始监控并执行任务队列中的任务
     *
     * @public
     */
    start() {
        if (this[IS_EXECUTING]) {
            return;
        }

        this[IS_EXECUTING] = true;
        this[EXECUTE]();
    }

    [EXECUTE]() {
        if (!this[IS_EXECUTING]) {
            return;
        }

        requestAnimationFrame(() => {
            /* eslint-disable guard-for-in */
            for (let taskId in this[TASKS]) {
            /* eslint-enable guard-for-in */
                const task = this[TASKS][taskId];
                if (!task) {
                    continue;
                }

                try {
                    task.notifyFn(null, task.fn());
                }
                catch (error) {
                    task.notifyFn(error);
                }
                if (this[TASKS]) {
                    this[TASKS][taskId] = null;
                }
            }
        });
    }
}
