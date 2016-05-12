/**
 * @file 数据容器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {isClass, extend, type, isFunction} from './utils';
import Event from './Event';
import DoneChecker from './DoneChecker';

const STORE = Symbol('store');
const PARENT = Symbol('parent');
const CHILDREN = Symbol('children');

export default class ScopeModel extends Event {
    constructor(...args) {
        super(...args);

        this[STORE] = {};
        this[PARENT] = null;
        this[CHILDREN] = [];
    }

    setParent(parent) {
        if (parent && !(parent instanceof ScopeModel)) {
            throw new TypeError('wrong scope parent');
        }
        this[PARENT] = parent;
    }

    addChild(child) {
        this[CHILDREN].push(child);
    }

    removeChild(child) {
        const children = [];
        for (let i = 0, il = this[CHILDREN].length; i < il; ++i) {
            if (this[CHILDREN][i] !== child) {
                children.push(this[CHILDREN][i]);
            }
        }
        this[CHILDREN] = children;
    }

    set(name, value, isSilent, done) {
        let changeObj;

        if (isClass(name, 'String')) {
            changeObj = setProperty(this, name, value);
            if (changeObj && !isSilent) {
                change(this, [changeObj], done);
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

            done = isSilent;
            isSilent = value;
            !isSilent && change(this, changes, done);
        }
    }

    get(...args) {
        let [name] = args;
        if (args.length > 1 || name === undefined) {
            return extend({}, this[STORE]);
        }

        if (name in this[STORE]) {
            return this[STORE][name];
        }

        if (this[PARENT]) {
            return this[PARENT].get(name);
        }
    }

    iterate(fn, context) {
        if (!isFunction(fn)) {
            return;
        }

        /* eslint-disable guard-for-in */
        for (let key in this[STORE]) {
            fn.call(context, this[STORE][key], key);
        }
        /* eslint-enable guard-for-in */
    }

    destroy() {
        super.destroy();
    }
}

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
    let type = model[STORE].hasOwnProperty(name) ? 'change' : 'add';
    let oldValue = model[STORE][name];
    model[STORE][name] = value;

    // 只是粗略记录一下set了啥
    return {
        type: type,
        name: name,
        oldValue: oldValue,
        newValue: value
    };
}

/**
 * 自己触发的change事件，就要负责到底，即通知所有的子孙scope。
 *
 * @param {ScopeModel} rootModel model对象
 * @param {Array.<Object>} changes 值改变记录
 * @param {function()} done 完成DOM更新操作后的回调
 */
function change(rootModel, changes, done) {
    const doneChecker = new DoneChecker(done);
    const delayFns = getDelayFns(rootModel, 'change');
    delayFns.forEach(fn => {
        doneChecker.add(done => {
            fn(done);
        });
    });
    doneChecker.complete();

    function getDelayFns(model, eventName) {
        let delayFns = [];

        // 直接锁定model的所有事件回调函数，防止前面的事件回调函数污染回调函数队列。
        let handlers = model.getEventHandlers(eventName);
        if (handlers && handlers.length) {
            handlers.forEach(handler => {
                delayFns.push(done => {
                    model.invokeEventHandler(
                        handler,
                        {
                            type: eventName,
                            model: rootModel,
                            changes: changes
                        },
                        done
                    );
                });
            });
        }

        // 遍历子孙model
        for (let i = 0, il = model[CHILDREN].length; i < il; ++i) {
            delayFns.push.apply(delayFns, getDelayFns(model[CHILDREN][i], 'parentchange'));
        }

        return delayFns;
    }
}
