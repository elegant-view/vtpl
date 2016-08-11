/**
 * @file 表达式计算器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

// import log from './log';

const GET_VARIABLE_NAMES_FROM_EXPR = Symbol('getVariableNamesFromExpr');
const FNS = Symbol('fns');
const EXPR_NAME_MAP = Symbol('exprNameMap');
const RESERVED_WORDS = Symbol('reservedWords');

/**
 * ExprCalculater
 *
 * @class
 */
export default class ExprCalculater {

    /**
     * constructor
     *
     * @public
     */
    constructor() {
        this[FNS] = {};
        this[EXPR_NAME_MAP] = {};

        this[RESERVED_WORDS] = [
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
     * @param  {string} expr        纯正的表达式字符串。`---{name}---`就不是纯正的，而`name`就算是纯正的。
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
        this[FNS][expr] = this[FNS][expr] || {};
        if (this[FNS][expr][avoidReturn]) {
            return this[FNS][expr][avoidReturn];
        }

        let params = this[GET_VARIABLE_NAMES_FROM_EXPR](expr);
        let fn = new Function(params, (avoidReturn ? '' : 'return ') + expr);

        let exprObj = {
            paramNames: params,
            fn: fn
        };
        this[FNS][expr][avoidReturn] = exprObj;
        return exprObj;
    }

    /**
     * 计算表达式的值
     *
     * @public
     * @param {string} expr 要计算的表达式
     * @param {boolean} avoidReturn 是否需要返回值
     * @param {ScopeModel} scopeModel 当前表达式所在的scope数据
     * @param {boolean=} shouldThrowException 是否应该抛出异常.默认情况下,会自动处理掉异常,但是在事件回调函数的场景中,还是需要抛出这个异常
     * @return {*}
     */
    calculate(expr, avoidReturn, scopeModel, shouldThrowException) {
        // 对expr='class'进行下转换
        if (expr === 'class') {
            expr = 'klass';
        }

        const fnObj = this[FNS][expr][avoidReturn];
        if (!fnObj) {
            throw new Error('no such expression function created!');
        }

        const fnArgs = [];
        for (let i = 0, il = fnObj.paramNames.length; i < il; i++) {
            const param = fnObj.paramNames[i];
            const value = scopeModel.get(param);
            fnArgs.push(value);
        }

        let result;
        if (shouldThrowException) {
            result = fnObj.fn.apply(null, fnArgs);
        }
        else {
            try {
                result = fnObj.fn.apply(null, fnArgs);
            }
            catch (e) {
                result = undefined;
            }
        }

        return result;
    }

    /**
     * 销毁
     *
     * @public
     */
    destroy() {
        this[FNS] = null;
        this[EXPR_NAME_MAP] = null;
    }

    /**
     * 从表达式中抽离出变量名
     *
     * @private
     * @param  {string} expr 表达式字符串，类似于 `{name}` 中的 name
     * @return {Array.<string>}      变量名数组
     */
    [GET_VARIABLE_NAMES_FROM_EXPR](expr) {
        if (this[EXPR_NAME_MAP][expr]) {
            return this[EXPR_NAME_MAP][expr];
        }

        let possibleVariables = expr.match(/[\w$]+/g);
        if (!possibleVariables || !possibleVariables.length) {
            return [];
        }

        let variables = [];
        for (let variable of possibleVariables) {
            // 如果以数字开头,那就不是变量
            if (!isNaN(parseInt(variable, 10))) {
                continue;
            }

            // 如果是javascript保留字,就不是变量
            let isReservedWord = false;
            for (let i = 0, il = this[RESERVED_WORDS].length; i < il; ++i) {
                if (this[RESERVED_WORDS][i] === variable) {
                    isReservedWord = true;
                    break;
                }
            }
            if (isReservedWord) {
                continue;
            }

            variables.push(variable);
        }

        this[EXPR_NAME_MAP][expr] = variables;

        return variables;
    }
}
