/**
 * @file 表达式检测器。检测器实例应该是跟树实例绑定在一起的
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {bind, forEach, isArray, isClass, type, empty} from './utils';
import Event from './Event';
import clone from './clone';
import deepEqual from './deepEqual';

export default class ExprWatcher extends Event {

    constructor(scopeModel, exprCalculater) {
        super();

        this.$$scopeModel = scopeModel;
        this.$$exprCalculater = exprCalculater;

        this.$$exprs = {};
        this.$$paramNameToExprMap = {};
        this.$$exprOldValues = {};
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
     * @param {string} expr 表达式字符串，带有`${}`的
     */
    addExpr(expr) {
        let {paramNameDependency, fn} = this.generateExpressionFunction(expr);
        this.addParamName2ExprMap(paramNameDependency, expr);
        this.$$exprs[expr] = () => fn(this.$$scopeModel);
    }

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
            if (!this.equals(expr, exprValue, oldValue)) {
                this.trigger('change', {expr, newValue: exprValue, oldValue: oldValue});
                this.$$exprOldValues[expr] = this.dump(exprValue);
            }
        }
    }

    calculate(expr) {
        return this.$$exprs[expr]();
    }

    /**
     * 深复制一份obj（只针对可枚举的属性）。
     *
     * @private
     * @param  {*} obj 要复制的对象
     * @return {*} 复制好的对象
     */
    dump(obj) {
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
        return deepEqual(newValue, oldValue);
    }

    destroy() {
        this.stop();
    }
}
