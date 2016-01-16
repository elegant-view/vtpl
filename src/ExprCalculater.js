/**
 * @file 表达式计算器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var utils = require('./utils');

function ExprCalculater() {
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
ExprCalculater.prototype.createExprFn = function (expr, avoidReturn) {
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

    var params = getVariableNamesFromExpr(this, expr);
    var fn = new Function(params, (avoidReturn ? '' : 'return ') + expr);

    var exprObj = {
        paramNames: params,
        fn: fn
    };
    this.fns[expr][avoidReturn] = exprObj;
    return exprObj;
};

ExprCalculater.prototype.calculate = function (expr, avoidReturn, scopeModel) {
    // 对expr='class'进行下转换
    if (expr === 'class') {
        expr = 'klass';
    }

    var fnObj = this.fns[expr][avoidReturn];
    if (!fnObj) {
        throw new Error('no such expression function created!');
    }

    var fnArgs = [];
    for (var i = 0, il = fnObj.paramNames.length; i < il; i++) {
        var param = fnObj.paramNames[i];
        var value = scopeModel.get(param);
        fnArgs.push(value === undefined ? '' : value);
    }

    var result;
    try {
        result = fnObj.fn.apply(null, fnArgs);
    }
    catch (e) {
        result = '';
    }
    return result;
};

ExprCalculater.prototype.destroy = function () {
    this.fns = null;
    this.exprNameMap = null;
    this.exprNameRegExp = null;
};

module.exports = ExprCalculater;

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

    var reg = /[\$|_|a-z|A-Z]{1}(?:[a-z|A-Z|0-9|\$|_]*)/g;

    for (var names = {}, name = reg.exec(expr); name; name = reg.exec(expr)) {
        var restStr = expr.slice(name.index + name[0].length);

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

    var ret = [];
    utils.each(names, function (isOk, name) {
        if (isOk) {
            ret.push(name);
        }
    });
    me.exprNameMap[expr] = ret;

    return ret;

    function isInQuote(preStr, restStr) {
        if ((preStr.lastIndexOf('\'') + 1 && restStr.indexOf('\'') + 1)
            || (preStr.lastIndexOf('"') + 1 && restStr.indexOf('"') + 1)
        ) {
            return true;
        }
    }
}
