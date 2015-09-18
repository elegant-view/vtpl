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

module.exports = Event;
