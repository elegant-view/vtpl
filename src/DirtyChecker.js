/**
 * @file 脏检测器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

function DirtyChecker() {
    this.checkers = {};
}

DirtyChecker.prototype.setChecker = function (expr, checkerFn) {
    this.checkers[expr] = checkerFn;
};

DirtyChecker.prototype.getCheckers = function (expr) {
    return this.checkers[expr];
};
