/**
 * @file 数据容器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {isClass, extend, each, type, isFunction} from './utils';
import Event from './Event';

class ScopeModel extends Event {
    constructor(...args) {
        super(...args);

        this.store = {};
        this.parent;
        this.children = [];
    }

    setParent(parent) {
        this.parent = parent;
    }

    addChild(child) {
        this.children.push(child);
    }

    set(name, value) {
        let changeObj;

        if (isClass(name, 'String')) {
            changeObj = setProperty(this, name, value);
            if (changeObj) {
                change(this, [changeObj]);
            }
        }
        else if (type(name) === 'object') {
            let changes = [];
            for (let key in name) {
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
    }

    get(name) {
        if (arguments.length > 1 || name === undefined) {
            return extend({}, this.store);
        }

        if (name in this.store) {
            return this.store[name];
        }

        if (this.parent) {
            return this.parent.get(name);
        }
    }

    iterate(fn, context) {
        if (!isFunction(fn)) {
            return;
        }

        /* eslint-disable guard-for-in */
        for (let key in this.store) {
            fn.call(context, this.store[key], key);
        }
        /* eslint-enable guard-for-in */
    }
}

export default ScopeModel;

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
    let type = model.store.hasOwnProperty(name) ? 'change' : 'add';
    let oldValue = model.store[name];
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
    each(model.children, function (scope) {
        scope.trigger('parentchange', model, changes);
    });
}
