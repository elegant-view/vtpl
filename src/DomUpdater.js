/**
 * @file DOM 更新器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var utils = require('./utils');
var log = require('./log');

function DomUpdater() {
    this.tasks = {};
    this.isExecuting = false;
    this.doneFns = [];
}

var counter = 0;
DomUpdater.prototype.generateTaskId = function () {
    return counter++;
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
                try {
                    taskFn();
                }
                catch (e) {
                    log.warn(e);
                }
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

/**
 * 给指定节点的指定属性设置值
 *
 * TODO: 完善
 *
 * @static
 * @param {Node} node  DOM节点
 * @param {string} name  节点属性名
 * @param {Object} value 节点属性值
 * @return {*}
 */
DomUpdater.setAttr = function (node, name, value) {
    // 目前仅处理元素节点，以后是否处理其他类型的节点，以后再说
    if (node.nodeType !== 1) {
        return;
    }

    if (name === 'style' && utils.isPureObject(value)) {
        return DomUpdater.setStyle(node, value);
    }

    node.setAttribute(name, value);
};

DomUpdater.setStyle = function (node, styleObj) {
    for (var k in styleObj) {
        node.style[k] = styleObj[k];
    }
};

module.exports = DomUpdater;
