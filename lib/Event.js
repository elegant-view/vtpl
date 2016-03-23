define(['exports', './utils'], function (exports, _utils) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    function _toConsumableArray(arr) {
        if (Array.isArray(arr)) {
            for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
                arr2[i] = arr[i];
            }

            return arr2;
        } else {
            return Array.from(arr);
        }
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

    var Event = function () {
        function Event() {
            _classCallCheck(this, Event);

            this.evnts = {};
        }

        _createClass(Event, [{
            key: 'on',
            value: function on(eventName, fn, context) {
                if (!(0, _utils.isFunction)(fn)) {
                    return;
                }

                this.evnts[eventName] = this.evnts[eventName] || [];

                this.evnts[eventName].push({ fn: fn, context: context });
            }
        }, {
            key: 'trigger',
            value: function trigger(eventName) {
                var _arguments = arguments,
                    _this = this;

                var fnObjs = this.evnts[eventName];
                if (fnObjs && fnObjs.length) {
                    (function () {
                        var args = (0, _utils.slice)(_arguments, 1);

                        // 这个地方现在不处理事件回调队列污染的问题了，
                        // 因为对于本库来说，收效甚微，同时可以在另外的地方解决掉由此带来的bug
                        (0, _utils.forEach)(fnObjs, function (fnObj) {
                            return _this.invokeEventHandler.apply(_this, [fnObj].concat(_toConsumableArray(args)));
                        });
                    })();
                }
            }
        }, {
            key: 'invokeEventHandler',
            value: function invokeEventHandler(handler) {
                for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                    args[_key - 1] = arguments[_key];
                }

                return handler.fn.apply(handler.context, args);
            }
        }, {
            key: 'getEventHandlers',
            value: function getEventHandlers(eventName) {
                return this.evnts[eventName];
            }
        }, {
            key: 'off',
            value: function off(eventName, fn) {
                var _this2 = this;

                if (arguments.length === 0) {
                    this.evnts = {};
                }

                if (!fn) {
                    this.evnts[eventName] = null;
                    return;
                }

                var fnObjs = this.evnts[eventName];
                if (fnObjs && fnObjs.length) {
                    (function () {
                        var newFnObjs = [];
                        (0, _utils.forEach)(fnObjs, function (fnObj) {
                            if (fn !== fnObj.fn) {
                                newFnObjs.push(fnObj);
                            }
                        });
                        _this2.evnts[eventName] = newFnObjs;
                    })();
                }
            }
        }, {
            key: 'isAllRemoved',
            value: function isAllRemoved() {
                var eventName = void 0;
                var fn = void 0;
                if (arguments.length === 0 || arguments.length > 2) {
                    throw new TypeError('wrong arguments');
                }

                if (arguments.length >= 1 && (0, _utils.isClass)(arguments[0], 'String')) {
                    eventName = arguments[0];
                }
                if (arguments.length === 2 && (0, _utils.isFunction)(arguments[1])) {
                    fn = arguments[1];
                }

                var fnObjs = this.evnts[eventName];
                if (fnObjs && fnObjs.length) {
                    if (fn) {
                        for (var i = 0, il = fnObjs.length; i < il; ++i) {
                            var fnObj = fnObjs[i];
                            if (fnObj.fn === fn) {
                                return false;
                            }
                        }
                    }

                    // 只传了eventName，没有传callback，存在eventName对应的回调函数
                    return false;
                }

                return true;
            }
        }]);

        return Event;
    }();

    exports.default = Event;
});