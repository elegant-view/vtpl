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

    removeChild(child) {
        let children = [];
        for (let i = 0, il = this.children.length; i < il; ++i) {
            if (this.children[i] !== child) {
                children.push(this.children[i]);
            }
        }
        this.children = children;
    }

    set(name, value, isSilent) {
        let changeObj;

        if (isClass(name, 'String')) {
            changeObj = setProperty(this, name, value);
            if (changeObj && !isSilent) {
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
            isSilent = value;
            !isSilent && change(this, changes);
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
 * 自己触发的change事件，就要负责到底，即通知所有的子孙scope。
 *
 * @param {ScopeModel} rootModel model对象
 * @param {Array.<Object>} changes 值改变记录
 */
function change(rootModel, changes) {
    let delayFns = getDelayFns(rootModel, 'change');
    each(delayFns, fn => fn());

    function getDelayFns(model, eventName) {
        let delayFns = [];

        // 直接锁定model的所有事件回调函数，防止前面的事件回调函数污染回调函数队列。
        let handlers = model.getEventHandlers(eventName);
        if (handlers && handlers.length) {
            each(handlers, handler => {
                delayFns.push(() => {
                    model.invokeEventHandler(
                        handler,
                        {
                            type: eventName,
                            model: rootModel,
                            changes: changes
                        }
                    );
                });
            });
        }

        // 遍历子孙model
        for (let i = 0, il = model.children.length; i < il; ++i) {
            delayFns.push.apply(delayFns, getDelayFns(model.children[i], 'parentchange'));
        }

        return delayFns;
    }
}
