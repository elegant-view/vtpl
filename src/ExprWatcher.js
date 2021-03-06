/**
 * @file 表达式检测器。检测器实例应该是跟树实例绑定在一起的
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import * as utils from './utils';
import DoneEvent from './DoneEvent';
import clone from './clone';
import deepEqual from './deepEqual';
import Data from './Data';
import DoneChecker from './DoneChecker';

const SCOPE_MODEL = Symbol('scopeModel');
const EXPR_CALCULATER = Symbol('exprCalculater');
const EXPRS = Symbol('exprs');
const PARAM_NAME_TO_EXPR_MAP = Symbol('paramNameToExprMap');
const EXPR_OLD_VALUES = Symbol('exprOldValues');
const EXPR_EQUAL_FN = Symbol('exprEqualFn');
const EXPR_CLONE_FN = Symbol('exprCloneFn');
const EXPR_SUSPEND = Symbol('exprSuspend');

const ADD_PARAM_NAME_TO_EXPR_MAP = Symbol('addParamName2ExprMap');
const GET_EXPRS_BY_PARAM_NAME = Symbol('getExprsByParamName');
const GENERATE_EXPRESSION_FUNCTION = Symbol('generateExpressionFunction');
const CHECK = Symbol('check');
const COMPUTE = Symbol('compute');
const CONVERT_EXPRESSION_RESULT = Symbol('convertExpressionResult');
const DUMP = Symbol('dump');
const EQUALS = Symbol('equals');

/**
 * ExprWatcher
 *
 * @class
 * @extends {DoneEvent}
 */
export default class ExprWatcher extends DoneEvent {

    /**
     * constructor
     *
     * @public
     * @param  {ScopeModel} scopeModel     model
     * @param  {ExprCalculater} exprCalculater 表达式值计算器
     */
    constructor(scopeModel, exprCalculater) {
        super();

        this[SCOPE_MODEL] = scopeModel;
        this[EXPR_CALCULATER] = exprCalculater;

        this[EXPRS] = {};
        this[PARAM_NAME_TO_EXPR_MAP] = {};
        this[EXPR_OLD_VALUES] = {};

        this[EXPR_EQUAL_FN] = {};
        this[EXPR_CLONE_FN] = {};

        // 暂时不需要计算的表达式
        this[EXPR_SUSPEND] = {};
    }

    /**
     * 添加变量名到表达式的映射
     *
     * @private
     * @param {Array.<string>} names 分析出来的expr依赖的一组变量
     * @param {string} expr  表达式
     */
    [ADD_PARAM_NAME_TO_EXPR_MAP](names, expr) {
        for (let i = 0, il = names.length; i < il; ++i) {
            let paramName = names[i];
            let exprArr = this[PARAM_NAME_TO_EXPR_MAP][paramName] || [];
            exprArr.push(expr);
            this[PARAM_NAME_TO_EXPR_MAP][paramName] = exprArr;
        }
    }

    /**
     * 根据变量的名字拿到受该变量影响的表达式
     *
     * @private
     * @param  {string} name 变量名
     * @return {Array.<string>} 受影响的表达式
     */
    [GET_EXPRS_BY_PARAM_NAME](name) {
        return this[PARAM_NAME_TO_EXPR_MAP][name];
    }

    /**
     * 添加要检测的表达式
     *
     * @public
     * @param {string} expr 表达式字符串，带有`{}`的
     */
    addExpr(expr) {
        const {paramNameDependency, fn} = this[GENERATE_EXPRESSION_FUNCTION](expr);
        this[ADD_PARAM_NAME_TO_EXPR_MAP](paramNameDependency, expr);
        this[EXPRS][expr] = () => fn(this[SCOPE_MODEL]);
    }

    /**
     * 设置表达式相等判断函数
     *
     * @public
     * @param {string} expr    表达式
     * @param {Function} equalFn 相等判断函数
     */
    setExprEqualsFn(expr, equalFn) {
        this[EXPR_EQUAL_FN][expr] = equalFn;
    }

    /**
     * 设置表达式值克隆函数
     *
     * @public
     * @param {string} expr    表达式
     * @param {Function} cloneFn 克隆函数
     */
    setExprCloneFn(expr, cloneFn) {
        this[EXPR_CLONE_FN][expr] = cloneFn;
    }

    /**
     * 生成表达式计算函数
     *
     * @private
     * @param  {string} expr 表达式字符串
     * @return {Object}
     */
    [GENERATE_EXPRESSION_FUNCTION](expr) {
        // 先去掉expr里面前后空格
        expr = utils.trim(expr);

        const exprs = expr.match(/{(.+?)}/g);
        if (!exprs || !exprs.length) {
            return;
        }

        const paramNameDependency = [];
        const rawExprs = [];
        for (let i = 0, il = exprs.length; i < il; ++i) {
            const rawExpr = exprs[i].replace(/^{|}$/g, '');
            rawExprs.push(rawExpr);
            const paramNames = this[EXPR_CALCULATER].createExprFn(rawExpr, false).paramNames;
            paramNameDependency.push.apply(paramNameDependency, paramNames);
        }

        const me = this;

        return {
            paramNameDependency,
            fn() {
                if (rawExprs.length === 1 && expr.replace(/^{|}$/g, '') === rawExprs[0]) {
                    let result = me[EXPR_CALCULATER].calculate(rawExprs[0], false, me[SCOPE_MODEL]);
                    me[CONVERT_EXPRESSION_RESULT](result);
                    return result;
                }
                return expr.replace(/{(.+?)}/g, (...args) => {
                    let result = me[EXPR_CALCULATER].calculate(args[1], false, me[SCOPE_MODEL]);
                    me[CONVERT_EXPRESSION_RESULT](result);
                    return result;
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
        this[SCOPE_MODEL].on('change', this[CHECK], this);
        this[SCOPE_MODEL].on('parentchange', this[CHECK], this);
    }

    /**
     * 停止监听
     *
     * @public
     */
    stop() {
        this[SCOPE_MODEL].off('change', this[CHECK], this);
        this[SCOPE_MODEL].off('parentchange', this[CHECK], this);
    }

    /**
     * 唤醒
     *
     * @public
     * @param {function()} done 异步操作完成时的回调函数
     */
    resume(done) {
        const doneChecker = new DoneChecker(done);

        this.start();

        // 强制刷新一下数据
        /* eslint-disable guard-for-in */
        /* eslint-disable fecs-use-for-of */
        for (let expr in this[EXPRS]) {
        /* eslint-enable fecs-use-for-of */
        /* eslint-enable guard-for-in */

            /* eslint-disable no-loop-func */
            doneChecker.add(done => {
                const exprValue = this[EXPRS][expr]();
                const oldValue = this[EXPR_OLD_VALUES][expr];

                this.triggerWithDone('change', {type: 'resume', expr, newValue: exprValue, oldValue: oldValue}, done);
            });
            /* eslint-enable no-loop-func */
        }

        doneChecker.complete();
    }

    /**
     * 将指定表达式暂时挂起，在check的时候不做处理。
     *
     * @public
     * @param {string} expr 表达式
     */
    suspendExpr(expr) {
        if (this[EXPRS][expr]) {
            this[EXPR_SUSPEND][expr] = true;
        }
    }

    /**
     * 将指定表达式恢复检测。
     *
     * @public
     * @param {string} expr 表达式
     */
    resumeExpr(expr) {
        if (this[EXPRS][expr]) {
            this[EXPR_SUSPEND][expr] = false;
        }
    }

    /**
     * 检查this[EXPRS]里面的脏值情况，如果脏了，就会触发change事件
     *
     * @private
     * @param {Event} event 附带的一些参数
     * @param {function()} done 完成检查更新的回调函数
     */
    [CHECK](event, done) {
        const doneChecker = new DoneChecker(done);
        const delayFns = [];

        for (let change of event.changes) {
            const influencedExprs = this[GET_EXPRS_BY_PARAM_NAME](change.name);

            if (!influencedExprs) {
                continue;
            }

            for (let expr of influencedExprs) {
                // 表达式被挂起了
                if (this[EXPR_SUSPEND][expr]) {
                    continue;
                }

                delayFns.push(this[COMPUTE].bind(this, expr));
            }
        }

        for (let fn of delayFns) {
            doneChecker.add(fn);
        }

        doneChecker.complete();
    }

    /**
     * 计算表达式的值
     *
     * @private
     * @param {string} expr 表达式
     * @param {Function} done 回调
     */
    [COMPUTE](expr, done) {
        const exprValue = this[EXPRS][expr]();
        const oldValue = this[EXPR_OLD_VALUES][expr];

        const equals = utils.isFunction(this[EXPR_EQUAL_FN][expr])
            ? this[EXPR_EQUAL_FN][expr]
            : this[EQUALS].bind(this);
        const clone = utils.isFunction(this[EXPR_CLONE_FN][expr])
            ? this[EXPR_CLONE_FN][expr]
            : this[DUMP].bind(this);

        if (!equals(expr, exprValue, oldValue)) {
            this.triggerWithDone('change', {expr, newValue: exprValue, oldValue: oldValue}, done);
            this[EXPR_OLD_VALUES][expr] = clone(exprValue);
        }
        else {
            utils.isFunction(done) && done();
        }
    }

    /**
     * 计算表达式的值
     *
     * @public
     * @param  {string} expr 表达式字符串`{name}`
     * @return {*}      计算结果
     */
    calculate(expr) {
        if (!(expr in this[EXPRS])) {
            throw new Error('no such expression under the scope.');
        }

        const clone = utils.isFunction(this[EXPR_CLONE_FN][expr]) ? this[EXPR_CLONE_FN][expr] : this[DUMP].bind(this);
        const value = this[EXPRS][expr]();
        this[EXPR_OLD_VALUES][expr] = clone(value);
        return this[CONVERT_EXPRESSION_RESULT](value);
    }

    /**
     * 对某些值做预处理,方便显示
     *
     * @private
     * @param {*} result 表达式计算结果
     * @return {*} 预处理结果
     */
    [CONVERT_EXPRESSION_RESULT](result) {
        // if (result === undefined
        //     || result === null
        //     /* eslint-disable no-self-compare */
        //     || result !== result // 是NaN
        //     /* eslint-enable no-self-compare */
        // ) {
        //     return '';
        // }

        return result;
    }

    /**
     * 深复制一份obj（只针对可枚举的属性）。
     *
     * @private
     * @param  {*} obj 要复制的对象
     * @return {*} 复制好的对象
     */
    [DUMP](obj) {
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
    [EQUALS](expr, newValue, oldValue) {
        if (newValue instanceof Data) {
            return newValue.equals(oldValue);
        }
        if (oldValue instanceof Data) {
            return oldValue.equals(newValue);
        }

        return deepEqual(newValue, oldValue);
    }

    /**
     * 销毁
     *
     * @public
     */
    destroy() {
        if (this[SCOPE_MODEL]) {
            this.stop();
        }

        this[SCOPE_MODEL] = null;
        this[EXPR_CALCULATER] = null;

        this[EXPRS] = null;
        this[PARAM_NAME_TO_EXPR_MAP] = null;
        this[EXPR_OLD_VALUES] = null;

        this[EXPR_EQUAL_FN] = null;
        this[EXPR_CLONE_FN] = null;
    }
}
