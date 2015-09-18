var utils = require('./utils');

function ScopeModel() {
    this.store = {};
    this.parent;
}

ScopeModel.prototype.setParent = function (parent) {
    this.parent = parent;
};

ScopeModel.prototype.set = function (name, value) {
    if (utils.isClass(name, 'String')) {
        return this.store[name] = value;
    }

    if (!utils.isClass(name, 'Object')) {
        return;
    }

    utils.extend(this.store, name);
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

module.exports = ScopeModel;
