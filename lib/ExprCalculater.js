define(['exports', './log'], function (exports, _log) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _log2 = _interopRequireDefault(_log);

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

    var ExprCalculater = function () {
        function ExprCalculater() {
            _classCallCheck(this, ExprCalculater);

            this.fns = {};
            this.exprNameMap = {};

            this.reservedWords = ['abstract', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'double', 'else', 'enum', 'export', 'extends', 'false', 'final', 'finally', 'float', 'for', 'function', 'goto', 'if', 'implements', 'import', 'in', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'true', 'try', 'typeof', 'var', 'void', 'volatile', 'while', 'with'];
        }

        /**
         * 创建表达式计算函数
         *
         * @public
         * @param  {string} expr        纯正的表达式字符串。`---${name}---`就不是纯正的，而`name`就算是纯正的。
         * @param  {boolean} avoidReturn 最后生成的表达式计算函数是否需要返回值
         * @return {Object}             返回生成的表达式计算对象。
         */


        _createClass(ExprCalculater, [{
            key: 'createExprFn',
            value: function createExprFn(expr, avoidReturn) {
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

                var params = this.getVariableNamesFromExpr(expr);
                var fn = new Function(params, (avoidReturn ? '' : 'return ') + expr);

                var exprObj = {
                    paramNames: params,
                    fn: fn
                };
                this.fns[expr][avoidReturn] = exprObj;
                return exprObj;
            }
        }, {
            key: 'calculate',
            value: function calculate(expr, avoidReturn, scopeModel, shouldThrowException) {
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

                var result = void 0;
                if (shouldThrowException) {
                    result = fnObj.fn.apply(null, fnArgs);
                } else {
                    try {
                        result = fnObj.fn.apply(null, fnArgs);
                    } catch (e) {
                        // 将表达式的错误打印出来，方便调试
                        _log2.default.info(e.stack, '\n', expr, scopeModel);
                        result = '';
                    }
                }

                return result;
            }
        }, {
            key: 'destroy',
            value: function destroy() {
                this.fns = null;
                this.exprNameMap = null;
            }
        }, {
            key: 'getVariableNamesFromExpr',
            value: function getVariableNamesFromExpr(expr) {
                if (this.exprNameMap[expr]) {
                    return this.exprNameMap[expr];
                }

                var possibleVariables = expr.match(/[\w$]+/g);
                if (!possibleVariables || !possibleVariables.length) {
                    return [];
                }

                var variables = [];
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = possibleVariables[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var variable = _step.value;

                        // 如果以数字开头,那就不是变量
                        if (!isNaN(parseInt(variable, 10))) {
                            continue;
                        }

                        // 如果是javascript保留字,就不是变量
                        var isReservedWord = false;
                        for (var i = 0, il = this.reservedWords.length; i < il; ++i) {
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
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }

                this.exprNameMap[expr] = variables;

                return variables;
            }
        }]);

        return ExprCalculater;
    }();

    exports.default = ExprCalculater;
});