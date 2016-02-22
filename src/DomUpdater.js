/**
 * @file DOM 更新器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {empty} from './utils';

export default class DomUpdater {
    constructor() {
        this.tasks = {};
        this.isExecuting = false;
        this.doneFns = [];
        this.counter = 0;

        this.$$nodeAttrNameTaskIdMap = {};

        this.$$isExecuting = false;
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
        return this.counter++;
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
        var key = node.getNodeId() + '-' + attrName;
        if (!this.$$nodeAttrNameTaskIdMap[key]) {
            this.$$nodeAttrNameTaskIdMap[key] = this.generateTaskId();
        }

        return this.$$nodeAttrNameTaskIdMap[key];
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
        this.tasks[taskId] = {
            fn: taskFn,
            notifyFn: callback || empty
        };
    }

    /**
     * 销毁
     *
     * @public
     */
    destroy() {
        this.stop();
        this.tasks = null;
    }

    /**
     * 停止执行任务
     *
     * @public
     */
    stop() {
        this.$$isExecuting = false;
    }

    /**
     * 开始监控并执行任务队列中的任务
     *
     * @public
     */
    start() {
        if (this.$$isExecuting) {
            return;
        }

        this.$$isExecuting = true;
        execute.call(this);

        function execute() {
            requestAnimationFrame(() => {
                if (!this.$$isExecuting) {
                    return;
                }

                /* eslint-disable guard-for-in */
                for (let taskId in this.tasks) {
                /* eslint-enable guard-for-in */
                    let task = this.tasks[taskId];
                    if (!task) {
                        continue;
                    }

                    try {
                        task.notifyFn(null, task.fn());
                    }
                    catch (error) {
                        task.notifyFn(error);
                    }
                    if (this.tasks) {
                        this.tasks[taskId] = null;
                    }
                }
                execute.call(this);
            });
        }
    }
}
