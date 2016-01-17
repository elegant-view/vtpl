/**
 * @file DOM 更新器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {isFunction, bind, each} from './utils';

export default class DomUpdater {
    constructor() {
        this.tasks = {};
        this.isExecuting = false;
        this.doneFns = [];
        this.counter = 0;

        this.$$nodeAttrNameTaskIdMap = {};
    }

    generateTaskId() {
        return this.counter++;
    }

    generateNodeAttrUpdateId(node, attrName) {
        var key = node.getNodeId() + '-' + attrName;
        if (!this.$$nodeAttrNameTaskIdMap[key]) {
            this.$$nodeAttrNameTaskIdMap[key] = this.generateTaskId();
        }

        return this.$$nodeAttrNameTaskIdMap[key];
    }

    addTaskFn(taskId, taskFn) {
        this.tasks[taskId] = taskFn;
    }

    destroy() {
        this.tasks = null;
    }

    execute(doneFn) {
        if (isFunction(doneFn)) {
            this.doneFns.push(doneFn);
        }

        var me = this;
        if (!this.isExecuting) {
            this.isExecuting = true;
            requestAnimationFrame(function () {
                do {
                    var taskFns = getTaskFns(me.tasks);
                    me.tasks = {};
                    for (var i = 0, il = taskFns.length; i < il; ++i) {
                        taskFns[i]();
                    }
                } while (taskFns.length);

                setTimeout(bind(function (doneFns) {
                    each(doneFns, function (doneFn) {
                        doneFn();
                    });
                }, null, me.doneFns));
                me.doneFns = [];

                me.isExecuting = false;
            });
        }

        function getTaskFns(tasks) {
            var fns = [];
            for (var k in tasks) {
                fns.push(tasks[k]);
            }
            return fns;
        }
    }
}
