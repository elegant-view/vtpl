/**
 * @file 表达式检测器。检测器实例应该是跟树实例绑定在一起的
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {bind, forEach} from './utils';
import Event from './Event';
import clone from './clone';
import deepEqual from './deepEqual';
import Data from './Data';

export default class ExprWatcher extends Event {

    constructor(scopeModel, exprCalculater) {
        super();

        this.$$scopeModel = scopeModel;
        this.$$exprCalculater = exprCalculater;

        this.$$exprs = {};
        this.$$paramNameToExprMap = {};
        this.$$exprOldValues = {};

        this.$$exprEqualFn = {};
        this.$$exprCloneFn = {};
    }

    /**
     * 添加变量名到表达式的映射
     *
     * @private
     * @param {Array.<string>} names 分析出来的expr依赖的一组变量
     * @param {string} expr  表达式
     */
    addParamName2ExprMap(names, expr) {
        for (let i = 0, il = names.length; i < il; ++i) {
            let paramName = names[i];
            let exprArr = this.$$paramNameToExprMap[paramName] || [];
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
     * @param {string} expr 表达式字符串，带有`${}`的
     */
    addExpr(expr) {
        let {paramNameDependency, fn} = this.generateExpressionFunction(expr);
        this.addParamName2ExprMap(paramNameDependency, expr);
        this.$$exprs[expr] = () => fn(this.$$scopeModel);
    }

    setExprEqualFn(expr, equalFn) {
        this.$$exprEqualFn[expr] = equalFn;
    }

    setExprCloneFn(expr, cloneFn) {
        this.$$exprCloneFn[expr] = cloneFn;
    }

    /**
     * 生成表达式计算函数
     *
     * @private
     * @param  {string} expr 表达式字符串
     * @return {Object}
     */
    generateExpressionFunction(expr) {
        // 先去掉expr里面前后空格
        expr = expr.replace(/^\s+|\s+$/g, '');

        let exprs = expr.match(/\$\{(.+?)\}/g);
        if (!exprs || !exprs.length) {
            return;
        }

        let paramNameDependency = [];
        let rawExprs = [];
        for (let i = 0, il = exprs.length; i < il; ++i) {
            let rawExpr = exprs[i].replace(/^\$\{|\}$/g, '');
            rawExprs.push(rawExpr);
            let {paramNames} = this.$$exprCalculater.createExprFn(rawExpr, false);
            paramNameDependency.push.apply(paramNameDependency, paramNames);
        }

        return {
            paramNameDependency,
            fn: scopeModel => {
                if (rawExprs.length === 1) {
                    return this.$$exprCalculater.calculate(rawExprs[0], false, this.$$scopeModel);
                }
                return expr.replace(/\$\{(.+?)\}/g, (...args) => {
                    return this.$$exprCalculater.calculate(args[1], false, this.$$scopeModel);
                });
            }
        };
    }

    /**
     * 开始监听scopeModel的变化
     *
     * @public
     */
    start() {
        this.$$scopeModel.on('change', this.check, this);
        this.$$scopeModel.on('parentchange', this.check, this);
    }

    /**
     * 停止监听
     *
     * @public
     */
    stop() {
        this.$$scopeModel.off('change', this.check, this);
    }

    /**
     * 检查this.$$exprs里面的脏值情况，如果脏了，就会触发change事件
     *
     * @private
     * @param {Event} event 附带的一些参数
     */
    check(event) {
        let delayFns = [];

        forEach(event.changes, change => {
            let influencedExprs = this.getExprsByParamName(change.name);

            forEach(influencedExprs, expr => {
                let fn = this.$$exprs[expr];
                delayFns.push(bind(calculate, this, expr, fn));
            });
        });
        forEach(delayFns, fn => fn());

        function calculate(expr, fn) {
            let exprValue = fn();
            let oldValue = this.$$exprOldValues[expr];

            let equals = bind(this.$$exprEqualFn[expr], null) || bind(this.equals, this);
            let clone = bind(this.$$exprCloneFn[expr], null) || bind(this.dump, this);

            if (!equals(expr, exprValue, oldValue)) {
                this.trigger('change', {expr, newValue: exprValue, oldValue: oldValue});
                this.$$exprOldValues[expr] = clone(expr, exprValue);
            }
        }
    }

    /**
     * 计算表达式的值
     *
     * @public
     * @param  {string} expr 表达式字符串`${name}`
     * @return {*}      计算结果
     */
    calculate(expr) {
        return this.$$exprs[expr]();
    }

    /**
     * 深复制一份obj（只针对可枚举的属性）。
     *
     * @private
     * @param {string} expr 对应的表达式
     * @param  {*} obj 要复制的对象
     * @return {*} 复制好的对象
     */
    dump(expr, obj) {
        if (obj instanceof Data) {
            return obj.clone();
        }

        return clone(obj);
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
        if (newValue instanceof Data) {
            return newValue.equals(oldValue);
        }
        if (oldValue instanceof Data) {
            return oldValue.equals(newValue);
        }

        return deepEqual(newValue, oldValue);
    }

    destroy() {
        this.stop();
    }
}
