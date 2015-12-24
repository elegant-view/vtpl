var utils = require('./utils');
var Event = require('./Event');
var inherit = require('./inherit');

function ScopeModel() {
    Event.call(this);

    this.store = {};
    this.parent;
    this.children = [];
}

ScopeModel.prototype.setParent = function (parent) {
    this.parent = parent;
};

ScopeModel.prototype.addChild = function (child) {
    this.children.push(child);
};

ScopeModel.prototype.set = function (name, value) {
    if (utils.isClass(name, 'String')) {
        this.store[name] = value;
        change(this, {name: name, value: value});
    }
    else if (utils.isPureObject(name)) {
        utils.extend(this.store, name);
        change(this, name);
    }
};

ScopeModel.prototype.get = function (name) {
    if (arguments.length > 1 || name === undefined) {
        return this.store;
    }

    if (name in this.store) {
        return this.store[name];
    }

    if (this.parent) {
        return this.parent.get(name);
    }
};

ScopeModel.prototype.iterate = function (fn, context) {
    if (!utils.isFunction(fn)) {
        return;
    }

    for (var key in this.store) {
        fn.call(context, this.store[key], key);
    }
};

module.exports = inherit(ScopeModel, Event);

function change(me, changeObj) {
    me.trigger('change', me, changeObj);
    utils.each(me.children, function (scope) {
        scope.trigger('parentchange', me, changeObj);
    });
}
