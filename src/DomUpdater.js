/**
 * @file DOM 更新器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var utils = require('./utils');
var log = require('./log');

var eventList = ('blur focus focusin focusout load resize scroll unload click dblclick '
    + 'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave '
    + 'change select submit keydown keypress keyup error contextmenu').split(' ');

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
 * 给指定DOM节点的指定属性设置值
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

    if (name === 'class') {
        return DomUpdater.setClass(node, value);
    }

    if (isEventName(name)) {
        return DomUpdater.setEvent(node, name, value);
    }

    node.setAttribute(name, value);
};

DomUpdater.setEvent = function (node, name, value) {
    if (utils.isFunction(value)) {
        node[name] = function (event) {
            event = event || window.event;
            value(event);
        };
    }
    else {
        node[name] = null;
    }
};

DomUpdater.setClass = function (node, klass) {
    if (!klass) {
        return;
    }

    node.setAttribute('class', '');
    node.classList.add.apply(node.classList, DomUpdater.getClassList(klass));
};

DomUpdater.setStyle = function (node, styleObj) {
    for (var k in styleObj) {
        node.style[k] = styleObj[k];
    }
};

/**
 * 获取元素节点的属性值
 *
 * @static
 * @param {Node} node dom节点
 * @param {string} name 属性名
 * @return {*} 属性值
 */
DomUpdater.getAttr = function (node, name) {
    if (name === 'class') {
        return DomUpdater.getClassList(node.className);
    }
    return node.getAttribute(node);
};

DomUpdater.getClassList = function (klass) {
    var klasses = [];
    if (utils.isClass(klass, 'String')) {
        klasses = klass.split(' ');
    }
    else if (utils.isPureObject(klass)) {
        for (var k in klass) {
            if (klass[k]) {
                klasses.push(klass[k]);
            }
        }
    }
    else if (utils.isArray(klass)) {
        klasses = klass;
    }

    return klasses;
};

function isEventName(str) {
    if (str.indexOf('on') !== 0) {
        return;
    }
    str = str.slice(2);
    for (var i = 0, il = eventList.length; i < il; ++i) {
        if (str === eventList[i]) {
            return true;
        }
    }

    return false;
}

module.exports = DomUpdater;
