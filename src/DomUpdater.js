/**
 * @file DOM 更新器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var utils = require('./utils');

function DomUpdater() {
    this.tasks = {};
    this.isExecuting = false;
    this.doneFns = [];
    this.counter = 0;

    this.$$nodeAttrNameTaskIdMap = {};
}

DomUpdater.prototype.generateTaskId = function () {
    return this.counter++;
};

DomUpdater.prototype.generateNodeAttrUpdateId = function (node, attrName) {
    var key = node.getNodeId() + '-' + attrName;
    if (!this.$$nodeAttrNameTaskIdMap[key]) {
        this.$$nodeAttrNameTaskIdMap[key] = this.generateTaskId();
    }

    return this.$$nodeAttrNameTaskIdMap[key];
};

DomUpdater.prototype.addTaskFn = function (taskId, taskFn) {
    this.tasks[taskId] = taskFn;
};

DomUpdater.prototype.destroy = function () {
    this.tasks = null;
};

DomUpdater.prototype.execute = function (doneFn) {
    if (utils.isFunction(doneFn)) {
        this.doneFns.push(doneFn);
    }

    var me = this;
    if (!this.isExecuting) {
        this.isExecuting = true;
        requestAnimationFrame(function () {
            utils.each(me.tasks, function (taskFn) {
                // try {
                //     taskFn();
                // }
                // catch (e) {
                //     log.warn(e);
                // }
                taskFn();
            });
            me.tasks = {};

            setTimeout(utils.bind(function (doneFns) {
                utils.each(doneFns, function (doneFn) {
                    doneFn();
                });
            }, null, me.doneFns));
            me.doneFns = [];

            me.isExecuting = false;
        });
    }
};

module.exports = DomUpdater;
