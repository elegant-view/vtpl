/**
 * @file 表达式计算器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {each} from './utils';
import log from './log';

export default class ExprCalculater {
    constructor() {
        this.fns = {};

        this.exprNameMap = {};
        this.exprNameRegExp = /\.?\$?([a-z|A-Z]+|([a-z|A-Z]+[0-9]+[a-z|A-Z]*))/g;
    }

    /**
     * 创建表达式计算函数
     *
     * @public
     * @param  {string} expr        纯正的表达式字符串。`---${name}---`就不是纯正的，而`name`就算是纯正的。
     * @param  {boolean} avoidReturn 最后生成的表达式计算函数是否需要返回值
     * @return {Object}             返回生成的表达式计算对象。
     */
    createExprFn(expr, avoidReturn) {
        if (expr === 'klass') {
            throw new Error('`klass` is the preserved word for `class`');
        }
        // 对expr='class'进行下转换
        if (expr === 'class') {
            expr = 'klass';
        }

        avoidReturn = !!avoidReturn;
        this.fns[expr] = this.fns[expr] || {};
        if (this.fns[expr][avoidReturn]) {
            return this.fns[expr][avoidReturn];
        }

        let params = getVariableNamesFromExpr(this, expr);
        let fn = new Function(params, (avoidReturn ? '' : 'return ') + expr);

        let exprObj = {
            paramNames: params,
            fn: fn
        };
        this.fns[expr][avoidReturn] = exprObj;
        return exprObj;
    }

    calculate(expr, avoidReturn, scopeModel) {
        // 对expr='class'进行下转换
        if (expr === 'class') {
            expr = 'klass';
        }

        let fnObj = this.fns[expr][avoidReturn];
        if (!fnObj) {
            throw new Error('no such expression function created!');
        }

        let fnArgs = [];
        for (let i = 0, il = fnObj.paramNames.length; i < il; i++) {
            let param = fnObj.paramNames[i];
            let value = scopeModel.get(param);
            fnArgs.push(value === undefined ? '' : value);
        }

        let result;
        try {
            result = fnObj.fn.apply(null, fnArgs);
        }
        catch (e) {
            // 将表达式的错误打印出来，方便调试
            log.warn(e.stack, scopeModel);
            result = '';
        }
        return result;
    }

    destroy() {
        this.fns = null;
        this.exprNameMap = null;
        this.exprNameRegExp = null;
    }
}

/**
 * 从表达式中抽离出变量名
 *
 * @inner
 * @param {ExprCalculater} me 对应实例
 * @param  {string} expr 表达式字符串，类似于 `${name}` 中的 name
 * @return {Array.<string>}      变量名数组
 */
function getVariableNamesFromExpr(me, expr) {
    if (me.exprNameMap[expr]) {
        return me.exprNameMap[expr];
    }

    let reg = /[\$|_|a-z|A-Z]{1}(?:[a-z|A-Z|0-9|\$|_]*)/g;

    let names = {};
    for (let name = reg.exec(expr); name; name = reg.exec(expr)) {
        let restStr = expr.slice(name.index + name[0].length);

        // 是左值
        if (/^\s*=(?!=)/.test(restStr)) {
            continue;
        }

        // 变量名前面是否存在 `.` ，或者变量名是否位于引号内部
        if (name.index
            && (expr[name.index - 1] === '.'
                || isInQuote(
                        expr.slice(0, name.index),
                        restStr
                   )
            )
        ) {
            continue;
        }

        names[name[0]] = true;
    }

    let ret = [];
    each(names, function (isOk, name) {
        if (isOk) {
            ret.push(name);
        }
    });
    me.exprNameMap[expr] = ret;

    return ret;

    function isInQuote(preStr, restStr) {
        return ((preStr.lastIndexOf('\'') + 1 && restStr.indexOf('\'') + 1)
            || (preStr.lastIndexOf('"') + 1 && restStr.indexOf('"') + 1));
    }
}
