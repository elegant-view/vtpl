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

        this.reservedWords = [
            'abstract',
            'boolean',
            'break',
            'byte',
            'case',
            'catch',
            'char',
            'class',
            'const',
            'continue',
            'debugger',
            'default',
            'delete',
            'do',
            'double',
            'else',
            'enum',
            'export',
            'extends',
            'false',
            'final',
            'finally',
            'float',
            'for',
            'function',
            'goto',
            'if',
            'implements',
            'import',
            'in',
            'instanceof',
            'int',
            'interface',
            'long',
            'native',
            'new',
            'null',
            'package',
            'private',
            'protected',
            'public',
            'return',
            'short',
            'static',
            'super',
            'switch',
            'synchronized',
            'this',
            'throw',
            'throws',
            'transient',
            'true',
            'try',
            'typeof',
            'var',
            'void',
            'volatile',
            'while',
            'with'
        ];
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

        let params = this.getVariableNamesFromExpr(expr);
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
            log.info(e.stack, '\n', expr, scopeModel);
            result = '';
        }
        return result;
    }

    destroy() {
        this.fns = null;
        this.exprNameMap = null;
    }

    /**
     * 从表达式中抽离出变量名
     *
     * @inner
     * @param {ExprCalculater} me 对应实例
     * @param  {string} expr 表达式字符串，类似于 `${name}` 中的 name
     * @return {Array.<string>}      变量名数组
     */
    getVariableNamesFromExpr(expr) {
        if (this.exprNameMap[expr]) {
            return this.exprNameMap[expr];
        }

        let possibleVariables = expr.match(/[\w$]+/g);
        if (!possibleVariables || !possibleVariables.length) {
            return [];
        }

        let variables = [];
        for (let variable of possibleVariables) {
            // 如果以数字开头,那就不是变量
            if (!isNaN(parseInt(variable))) {
                continue;
            }

            // 如果是javascript保留字,就不是变量
            let isReservedWord = false;
            for (let i = 0, il = this.reservedWords.length; i < il; ++i) {
                if (this.reservedWords[i] === variable) {
                    isReservedWord = true;
                    break;
                }
            }
            if (isReservedWord) {
                continue;
            }

            variables.push(variable);
        }

        this.exprNameMap[expr] = variables;

        return variables;
    }
}

