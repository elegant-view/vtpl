/**
 * @file 数据容器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {isClass, extend, isFunction} from './utils';
import Event from './Event';
import DoneChecker from './DoneChecker';

const STORE = Symbol('store');
const PARENT = Symbol('parent');
const CHILDREN = Symbol('children');

const SET_PROPERTY = Symbol('setProperty');
const CHANGE = Symbol('change');

const BROADCAST = Symbol('broadcast');

export default class ScopeModel extends Event {
    constructor() {
        super();

        this[STORE] = {};
        this[PARENT] = null;
        this[CHILDREN] = [];
    }

    /**
     * 创建子scope
     *
     * @public
     * @return {ScopeModel}
     */
    createChild() {
        const scopeModel = new ScopeModel();
        this.addChild(scopeModel);
        return scopeModel;
    }

    addChild(childModel) {
        childModel[PARENT] = this;
        this[CHILDREN].push(childModel);
    }

    removeChild(childModel) {
        childModel[PARENT] = null;
        const newChildren = [];
        for (let i = 0, il = this[CHILDREN].length; i < il; ++i) {
            if (this[CHILDREN][i] !== childModel) {
                newChildren.push(this[CHILDREN][i]);
            }
        }
        this[CHILDREN] = newChildren;
    }

    set(name, value, isSilent, done) {
        let changeObj;

        if (isClass(name, 'String')) {
            changeObj = this[SET_PROPERTY](name, value);
            if (changeObj && !isSilent) {
                this[CHANGE]([changeObj], done);
            }
        }
        else if (typeof name === 'object') {
            const changes = [];
            for (let key in name) {
                if (!name.hasOwnProperty(key)) {
                    continue;
                }

                changeObj = this[SET_PROPERTY](key, name[key]);
                if (changeObj) {
                    changes.push(changeObj);
                }
            }

            done = isSilent;
            isSilent = value;
            !isSilent && this[CHANGE](changes, done);
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

    /**
     * 迭代存储的数据
     *
     * @public
     * @param  {Function} fn      迭代回调函数
     * @param  {*}   context 回调函数上下文
     */
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

    /**
     * 销毁
     *
     * @public
     */
    destroy() {
        super.destroy();

        for (let child of this[CHILDREN]) {
            child.destroy();
        }

        if (this[PARENT]) {
            // 将自己从parent里面移除
            const parentScope = this[PARENT];
            const children = [];
            for (let child of parentScope[CHILDREN]) {
                if (this !== child) {
                    children.push(child);
                }
            }
            parentScope[CHILDREN] = children;
            this[PARENT] = null;
        }
    }

    /**
     * 设置单个属性值
     *
     * @private
     * @param {string} name 属性名
     * @param {Mixed} value 对应的值
     * @return {meta.ChangeRecord} 一个变化记录项
     */
    [SET_PROPERTY](name, value) {
        const type = this[STORE].hasOwnProperty(name) ? 'change' : 'add';
        const oldValue = this[STORE][name];
        this[STORE][name] = value;

        // 只是粗略记录一下set了啥
        return {
            type,
            name,
            oldValue: oldValue,
            newValue: value
        };
    }

    /**
     * 自己触发的change事件，就要负责到底，即通知所有的子孙scope。
     *
     * @param {Array.<Object>} changes 值改变记录
     * @param {function()} done 完成DOM更新操作后的回调
     */
    [CHANGE](changes, done) {
        const doneChecker = new DoneChecker(done);
        doneChecker.add(this.triggerWithDone.bind(this, 'change', {type: 'change', model: this, changes}));
        doneChecker.add(this[BROADCAST].bind(this, this, {type: 'parentchange', model: this, changes}));
        doneChecker.complete();
    }

    [BROADCAST](parentModel, event, done) {
        const doneChecker = new DoneChecker(done);
        for (let i = 0, il = parentModel[CHILDREN].length; i < il; ++i) {
            const childModel = parentModel[CHILDREN][i];
            doneChecker.add(childModel.triggerWithDone.bind(childModel, 'parentchange', event));

            doneChecker.add(this[BROADCAST].bind(this, childModel, event));
        }
        doneChecker.complete();
    }
}
