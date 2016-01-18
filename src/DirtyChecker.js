/**
 * @file 脏检测器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

export default class DirtyChecker {
    constructor() {
        this.checkers = {};
        this.$$defaultCheckerFn = function (expr, exprValue, exprOldValue) {
            return exprValue !== exprOldValue;
        };
    }

    setDefaultChecker(checkerFn) {
        this.$$defaultCheckerFn = checkerFn;
    }

    setChecker(expr, checkerFn) {
        this.checkers[expr] = checkerFn;
    }

    getChecker(expr) {
        return this.checkers[expr] || this.$$defaultCheckerFn;
    }

    destroy() {
        this.checkers = null;
    }
}
