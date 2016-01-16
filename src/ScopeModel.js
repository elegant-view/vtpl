/**
 * @file 数据容器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

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
    var changeObj;

    if (utils.isClass(name, 'String')) {
        changeObj = setProperty(this, name, value);
        if (changeObj) {
            change(this, [changeObj]);
        }
    }
    else if (typeof name === 'object') {
        var changes = [];
        for (var key in name) {
            if (!name.hasOwnProperty(key)) {
                continue;
            }

            changeObj = setProperty(this, key, name[key]);
            if (changeObj) {
                changes.push(changeObj);
            }
        }
        change(this, changes);
    }
};

ScopeModel.prototype.get = function (name) {
    if (arguments.length > 1 || name === undefined) {
        return utils.extend({}, this.store);
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

    /* eslint-disable guard-for-in */
    for (var key in this.store) {
        fn.call(context, this.store[key], key);
    }
    /* eslint-enable guard-for-in */
};

module.exports = inherit(ScopeModel, Event);

/**
 * 设置单个属性值
 *
 * @param {ScopeModel} model 作为容器的Model对象
 * @param {string} name 属性名
 * @param {Mixed} value 对应的值
 * @return {meta.ChangeRecord} 一个变化记录项
 * @ignore
 */
function setProperty(model, name, value) {
    var type = model.store.hasOwnProperty(name) ? 'change' : 'add';
    var oldValue = model.store[name];
    model.store[name] = value;

    // 只在新旧值不同的情况下才有变化记录项
    if (oldValue !== value) {
        return {
            type: type,
            name: name,
            oldValue: oldValue,
            newValue: value
        };
    }

    return null;
}

/**
 * 触发change事件，并向子scopeModel广播
 *
 * @param {ScopeModel} model model对象
 * @param {Array.<Object>} changes 值改变记录
 */
function change(model, changes) {
    model.trigger('change', model, changes);
    utils.each(model.children, function (scope) {
        scope.trigger('parentchange', model, changes);
    });
}
