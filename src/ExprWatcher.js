/**
 * @file 表达式检测器。检测器实例应该是跟树实例绑定在一起的
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {bind, forEach, extend, isArray, isClass, type} from './utils';
import Event from './Event';

export default class ExprWatcher extends Event {

    constructor(scopeModel, exprCalculater) {
        super();

        this.$$scopeModel = scopeModel;
        this.$$exprCalculater = exprCalculater;

        this.$$exprs = {};
        this.$$paramNameToExprMap = {};
        this.$$exprOldValues = {};

        this.$$scopeModel.on('change', this.check, this);
    }



    /**
     * 添加变量名到表达式的映射
     *
     * @private
     * @param {Array.<string>} names 分析出来的expr依赖的一组变量
     * @param {string} expr  表达式
     */
    addParamName2ExprMap(names, expr) {
        for (var i = 0, il = names.length; i < il; ++i) {
            var paramName = names[i];
            var exprArr = this.$$paramNameToExprMap[paramName] || [];
            exprArr.push(expr);
            this.$$paramNameToExprMap[paramName] = exprArr;
        }
    }

    /**
     * 根据变量的名字拿到受该变量影响的表达式
     *
     * @private
     * @param  {string} name 变量名
     * @return {Array.<string>} 受影响的表达式
     */
    getExprsByParamName(name) {
        return this.$$paramNameToExprMap[name];
    }

    /**
     * 添加要检测的表达式
     *
     * @public
     * @param {string} expr 表达式字符串
     */
    addExpr(expr) {
        let {paramNames} = this.$$exprCalculater.createExprFn(expr, false);
        this.addParamName2ExprMap(paramNames, expr);
        this.$$exprs[expr] = () => {
            return this.$$exprCalculater.calculate(expr, false, this.$$scopeModel);
        };
    }

    /**
     * 检查this.$$exprs里面的脏值情况，如果脏了，就会触发change事件
     *
     * @private
     */
    check() {
        let delayFns = [];
        forEach(this.$$exprs, (fn, expr) => delayFns.push(bind(calculate, this, expr, fn)));
        forEach(delayFns, fn => fn());

        function calculate(expr, fn) {
            let exprValue = fn();
            let oldValue = this.$$exprOldValues[expr];
            if (!this.equals(expr, exprValue, oldValue)) {
                this.trigger('change', {expr, newValue: exprValue, oldValue: oldValue});
                this.$$exprOldValues[expr] = this.dump(exprValue);
            }
        }
    }

    /**
     * 深复制一份obj（只针对可枚举的属性）。
     *
     * @private
     * @param  {*} obj 要复制的对象
     * @return {*} 复制好的对象
     */
    dump(obj) {
        if (isArray(obj)) {
            let ret = [];
            forEach(obj, value => {
                ret.push(this.dump(value));
            });
            return ret;
        }

        if (isClass(obj, 'Date')) {
            return new Date(obj.getTime());
        }

        if (type(obj) === 'object') {
            return extend({}, obj);
        }

        return obj;
    }

    /**
     * 深度检查两个对象是否相等
     *
     * @private
     * @param  {string} expr     表达式字符串
     * @param  {*} newValue 新值
     * @param  {*} oldValue 旧值
     * @return {boolean} 是否相等
     */
    equals(expr, newValue, oldValue) {
        if (type(newValue) !== 'object') {
            return newValue === oldValue;
        }

        if (isClass(newValue, 'Date')) {
            return newValue === oldValue || (
                isClass(oldValue, 'Date') && newValue.getTime() === oldValue.getTime()
            );
        }

        if (isArray(newValue)) {
            if (newValue === oldValue) {
                return true;
            }

            if (!isArray(oldValue) || newValue.length !== oldValue.length) {
                return false;
            }

            for (let i = 0, il = newValue.length; i < il; ++i) {
                let newItem = newValue[i];
                let oldItem = oldValue[i];
                if (!this.equals(expr, newItem, oldItem)) {
                    return false;
                }
            }
            return true;
        }

        if (type(newValue) === 'object') {
            if (oldValue === newValue) {
                return true;
            }

            if (type(newValue) !== 'object') {
                return false;
            }

            for (let key in newValue) {
                if (!this.equals(expr, newValue[key], oldValue[key])) {
                    return false;
                }
            }
            return true;
        }

        return newValue === oldValue;
    }

    destroy() {}
}
