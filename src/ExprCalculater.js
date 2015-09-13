var utils = require('./utils');

function ExprCalculater() {
    this.fns = {};

    this.exprNameMap = {};
    this.exprNameRegExp = /\.?\$?([a-z|A-Z]+|([a-z|A-Z]+[0-9]+[a-z|A-Z]*))/g;
}

ExprCalculater.prototype.createExprFn = function (expr, avoidReturn) {
    avoidReturn = !!avoidReturn;
    this.fns[expr] = this.fns[expr] || {};
    if (this.fns[expr][avoidReturn]) {
        return;
    }

    var params = getVariableNamesFromExpr(this, expr);
    var fn = new Function(params, (avoidReturn ? '' : 'return ') + expr);

    this.fns[expr][avoidReturn] = {
        paramNames: params,
        fn: fn
    };
};

ExprCalculater.prototype.calculate = function (expr, avoidReturn, data) {
    var fnObj = this.fns[expr][avoidReturn];
    if (!fnObj) {
        throw new Error('no such expression function created!');
    }

    var fnArgs = [];
    for (var i = 0, il = fnObj.paramNames.length; i < il; i++) {
        var param = fnObj.paramNames[i];
        var value = data[param];
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

    var matches = expr.match(me.exprNameRegExp) || [];
    var names = {};
    for (var i = 0, il = matches.length; i < il; i++) {
        if (matches[i] && matches[i][0] !== '.') {
            names[matches[i]] = true;
        }
    }

    var ret = [];
    utils.each(names, function (isOk, name) {
        if (isOk) {
            ret.push(name);
        }
    });
    me.exprNameMap[expr] = ret;

    return ret;
}
