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
        change(this);
    }
    else if (utils.isPureObject(name)) {
        utils.extend(this.store, name);
        change(this);
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

module.exports = inherit(ScopeModel, Event);

function change(me) {
    me.trigger('change', me);
    utils.each(me.children, function (scope) {
        scope.trigger('parentchange', me);
    });
}
