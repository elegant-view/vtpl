/**
 * @file 事件
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var utils = require('./utils');

function Event() {
    this.evnts = {};
}

Event.prototype.on = function (eventName, fn, context) {
    if (!utils.isFunction(fn)) {
        return;
    }

    this.evnts[eventName] = this.evnts[eventName] || [];

    this.evnts[eventName].push({
        fn: fn,
        context: context
    });
};

Event.prototype.trigger = function (eventName) {
    var fnObjs = this.evnts[eventName];
    if (fnObjs && fnObjs.length) {
        var args = utils.slice(arguments, 1);
        utils.each(fnObjs, function (fnObj) {
            fnObj.fn.apply(fnObj.context, args);
        });
    }
};

Event.prototype.off = function (eventName, fn) {
    if (!fn) {
        this.evnts[eventName] = null;
        return;
    }

    var fnObjs = this.evnts[eventName];
    if (fnObjs && fnObjs.length) {
        var newFnObjs = [];
        utils.each(fnObjs, function (fnObj) {
            if (fn !== fnObj.fn) {
                newFnObjs.push(fnObj);
            }
        });
        this.evnts[eventName] = newFnObjs;
    }
};

Event.prototype.isAllRemoved = function () {
    var eventName;
    var fn;
    if (arguments.length === 0 || arguments.length > 2) {
        throw new TypeError('wrong arguments');
    }

    if (arguments.length >= 1 && utils.isClass(arguments[0], 'String')) {
        eventName = arguments[0];
    }
    if (arguments.length === 2 && utils.isFunction(arguments[1])) {
        fn = arguments[1];
    }

    var fnObjs = this.events[eventName];
    if (fnObjs && fnObjs.length) {
        if (fn) {
            for (var i = 0, il = fnObjs.length; i < il; ++i) {
                var fnObj = fnObjs[i];
                if (fnObj.fn === fn) {
                    return false;
                }
            }
        }

        // 只传了eventName，没有传callback，存在eventName对应的回调函数
        return false;
    }

    return true;
};

module.exports = Event;
