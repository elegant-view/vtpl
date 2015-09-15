/**
 * @file DOM 更新器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var utils = require('./utils');

function DomUpdater() {
    this.tasks = [];
}

DomUpdater.prototype.addTaskFn = function (taskFn) {
    this.tasks.push(taskFn);
};

DomUpdater.prototype.executeTaskFns = function (doneFn) {
    setTimeout(
        utils.bind(
            function (tasks, doneFn) {
                utils.each(tasks, function (taskFn) {
                    try {
                        taskFn();
                    }
                    catch (e) {}
                });

                if (utils.isFunction(doneFn)) {
                    doneFn();
                }
            },
            null,
            this.tasks,
            doneFn
        )
    );

    this.tasks = [];
};

DomUpdater.prototype.destroy = function () {
    this.tasks = null;
};

module.exports = DomUpdater;
