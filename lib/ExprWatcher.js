var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

define(['exports', './utils', './Event', './clone', './deepEqual', './Data'], function (exports, _utils, _Event2, _clone, _deepEqual, _Data) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _Event3 = _interopRequireDefault(_Event2);

    var _clone2 = _interopRequireDefault(_clone);

    var _deepEqual2 = _interopRequireDefault(_deepEqual);

    var _Data2 = _interopRequireDefault(_Data);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && ((typeof call === 'undefined' ? 'undefined' : _typeof(call)) === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var ExprWatcher = function (_Event) {
        _inherits(ExprWatcher, _Event);

        function ExprWatcher(scopeModel, exprCalculater) {
            _classCallCheck(this, ExprWatcher);

            var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ExprWatcher).call(this));

            _this.$$scopeModel = scopeModel;
            _this.$$exprCalculater = exprCalculater;

            _this.$$exprs = {};
            _this.$$paramNameToExprMap = {};
            _this.$$exprOldValues = {};

            _this.$$exprEqualFn = {};
            _this.$$exprCloneFn = {};

            // 暂时不需要计算的表达式
            _this.$$exprSuspend = {};
            return _this;
        }

        /**
         * 添加变量名到表达式的映射
         *
         * @private
         * @param {Array.<string>} names 分析出来的expr依赖的一组变量
         * @param {string} expr  表达式
         */

        _createClass(ExprWatcher, [{
            key: 'addParamName2ExprMap',
            value: function addParamName2ExprMap(names, expr) {
                for (var i = 0, il = names.length; i < il; ++i) {
                    var paramName = names[i];
                    var exprArr = this.$$paramNameToExprMap[paramName] || [];
                    exprArr.push(expr);
                    this.$$paramNameToExprMap[paramName] = exprArr;
                }
            }
        }, {
            key: 'getExprsByParamName',
            value: function getExprsByParamName(name) {
                return this.$$paramNameToExprMap[name];
            }
        }, {
            key: 'addExpr',
            value: function addExpr(expr) {
                var _this2 = this;

                var _generateExpressionFu = this.generateExpressionFunction(expr);

                var paramNameDependency = _generateExpressionFu.paramNameDependency;
                var fn = _generateExpressionFu.fn;

                this.addParamName2ExprMap(paramNameDependency, expr);
                this.$$exprs[expr] = function () {
                    return fn(_this2.$$scopeModel);
                };
            }
        }, {
            key: 'setExprEqualsFn',
            value: function setExprEqualsFn(expr, equalFn) {
                this.$$exprEqualFn[expr] = equalFn;
            }
        }, {
            key: 'setExprCloneFn',
            value: function setExprCloneFn(expr, cloneFn) {
                this.$$exprCloneFn[expr] = cloneFn;
            }
        }, {
            key: 'generateExpressionFunction',
            value: function generateExpressionFunction(expr) {
                var _this3 = this;

                // 先去掉expr里面前后空格
                expr = expr.replace(/^\s+|\s+$/g, '');

                var exprs = expr.match(/\$\{(.+?)\}/g);
                if (!exprs || !exprs.length) {
                    return;
                }

                var paramNameDependency = [];
                var rawExprs = [];
                for (var i = 0, il = exprs.length; i < il; ++i) {
                    var rawExpr = exprs[i].replace(/^\$\{|\}$/g, '');
                    rawExprs.push(rawExpr);

                    var _$$exprCalculater$cre = this.$$exprCalculater.createExprFn(rawExpr, false);

                    var paramNames = _$$exprCalculater$cre.paramNames;

                    paramNameDependency.push.apply(paramNameDependency, paramNames);
                }

                return {
                    paramNameDependency: paramNameDependency,
                    fn: function fn() {
                        if (rawExprs.length === 1 && expr.replace(/^\$\{|\}$/g, '') === rawExprs[0]) {
                            var result = _this3.$$exprCalculater.calculate(rawExprs[0], false, _this3.$$scopeModel);
                            _this3.convertExpressionResult(result);
                            return result;
                        }
                        return expr.replace(/\$\{(.+?)\}/g, function () {
                            var result = _this3.$$exprCalculater.calculate(arguments.length <= 1 ? undefined : arguments[1], false, _this3.$$scopeModel);
                            _this3.convertExpressionResult(result);
                            return result;
                        });
                    }
                };
            }
        }, {
            key: 'start',
            value: function start() {
                this.$$scopeModel.on('change', this.check, this);
                this.$$scopeModel.on('parentchange', this.check, this);
            }
        }, {
            key: 'stop',
            value: function stop() {
                this.$$scopeModel.off('change', this.check, this);
                this.$$scopeModel.off('parentchange', this.check, this);
            }
        }, {
            key: 'resume',
            value: function resume() {
                this.start();

                // 强制刷新一下数据
                for (var expr in this.$$exprs) {
                    this.compute(expr);
                }
            }
        }, {
            key: 'suspendExpr',
            value: function suspendExpr(expr) {
                if (this.$$exprs[expr]) {
                    this.$$exprSuspend[expr] = true;
                }
            }
        }, {
            key: 'resumeExpr',
            value: function resumeExpr(expr) {
                if (this.$$exprs[expr]) {
                    this.$$exprSuspend[expr] = false;
                }
            }
        }, {
            key: 'check',
            value: function check(event) {
                var _this4 = this;

                var delayFns = [];

                (0, _utils.forEach)(event.changes, function (change) {
                    var influencedExprs = _this4.getExprsByParamName(change.name);

                    (0, _utils.forEach)(influencedExprs, function (expr) {
                        // 表达式被挂起了
                        if (_this4.$$exprSuspend[expr]) {
                            return;
                        }

                        delayFns.push((0, _utils.bind)(_this4.compute, _this4, expr));
                    });
                });
                (0, _utils.forEach)(delayFns, function (fn) {
                    return fn();
                });
            }
        }, {
            key: 'compute',
            value: function compute(expr) {
                var exprValue = this.$$exprs[expr]();
                var oldValue = this.$$exprOldValues[expr];

                var equals = (0, _utils.bind)(this.$$exprEqualFn[expr], null) || (0, _utils.bind)(this.equals, this);
                var clone = (0, _utils.bind)(this.$$exprCloneFn[expr], null) || (0, _utils.bind)(this.dump, this);

                if (!equals(expr, exprValue, oldValue)) {
                    this.trigger('change', { expr: expr, newValue: exprValue, oldValue: oldValue });
                    this.$$exprOldValues[expr] = clone(exprValue);
                }
            }
        }, {
            key: 'calculate',
            value: function calculate(expr) {
                if (!(expr in this.$$exprs)) {
                    throw new Error('no such expression under the scope.');
                }

                var clone = (0, _utils.bind)(this.$$exprCloneFn[expr], null) || (0, _utils.bind)(this.dump, this);
                var value = this.$$exprs[expr]();
                this.$$exprOldValues[expr] = clone(value);
                return this.convertExpressionResult(value);
            }
        }, {
            key: 'convertExpressionResult',
            value: function convertExpressionResult(result) {
                if (result === undefined || result === null || result !== result // 是NaN
                ) {
                        return '';
                    }

                return result;
            }
        }, {
            key: 'dump',
            value: function dump(obj) {
                if (obj instanceof _Data2.default) {
                    return obj.clone();
                }

                return (0, _clone2.default)(obj);
            }
        }, {
            key: 'equals',
            value: function equals(expr, newValue, oldValue) {
                if (newValue instanceof _Data2.default) {
                    return newValue.equals(oldValue);
                }
                if (oldValue instanceof _Data2.default) {
                    return oldValue.equals(newValue);
                }

                return (0, _deepEqual2.default)(newValue, oldValue);
            }
        }, {
            key: 'destroy',
            value: function destroy() {
                this.stop();

                this.$$scopeModel = null;
                this.$$exprCalculater = null;

                this.$$exprs = null;
                this.$$paramNameToExprMap = null;
                this.$$exprOldValues = null;

                this.$$exprEqualFn = null;
                this.$$exprCloneFn = null;
            }
        }]);

        return ExprWatcher;
    }(_Event3.default);

    exports.default = ExprWatcher;
});
//# sourceMappingURL=/Users/baidu/elegant-view/vtpl/ExprWatcher.js.map