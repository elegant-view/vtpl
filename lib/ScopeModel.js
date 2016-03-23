var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

define(['exports', './utils', './Event'], function (exports, _utils, _Event2) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _Event3 = _interopRequireDefault(_Event2);

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

    var ScopeModel = function (_Event) {
        _inherits(ScopeModel, _Event);

        function ScopeModel() {
            var _Object$getPrototypeO;

            _classCallCheck(this, ScopeModel);

            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            var _this = _possibleConstructorReturn(this, (_Object$getPrototypeO = Object.getPrototypeOf(ScopeModel)).call.apply(_Object$getPrototypeO, [this].concat(args)));

            _this.store = {};
            _this.parent = null;
            _this.children = [];
            return _this;
        }

        _createClass(ScopeModel, [{
            key: 'setParent',
            value: function setParent(parent) {
                if (!(parent instanceof ScopeModel)) {
                    throw new TypeError('wrong scope parent');
                }
                this.parent = parent;
            }
        }, {
            key: 'addChild',
            value: function addChild(child) {
                this.children.push(child);
            }
        }, {
            key: 'removeChild',
            value: function removeChild(child) {
                var children = [];
                for (var i = 0, il = this.children.length; i < il; ++i) {
                    if (this.children[i] !== child) {
                        children.push(this.children[i]);
                    }
                }
                this.children = children;
            }
        }, {
            key: 'set',
            value: function set(name, value, isSilent) {
                var changeObj = undefined;

                if ((0, _utils.isClass)(name, 'String')) {
                    changeObj = setProperty(this, name, value);
                    if (changeObj && !isSilent) {
                        change(this, [changeObj]);
                    }
                } else if ((0, _utils.type)(name) === 'object') {
                    var changes = [];
                    for (var key in name) {
                        if (!name.hasOwnProperty(key)) {
                            continue;
                        }

                        changeObj = setProperty(this, key, name[key]);
                        if (changeObj) {
                            changes.push(changeObj);
                        }
                    }
                    isSilent = value;
                    !isSilent && change(this, changes);
                }
            }
        }, {
            key: 'get',
            value: function get(name) {
                if (arguments.length > 1 || name === undefined) {
                    return (0, _utils.extend)({}, this.store);
                }

                if (name in this.store) {
                    return this.store[name];
                }

                if (this.parent) {
                    return this.parent.get(name);
                }
            }
        }, {
            key: 'iterate',
            value: function iterate(fn, context) {
                if (!(0, _utils.isFunction)(fn)) {
                    return;
                }

                /* eslint-disable guard-for-in */
                for (var key in this.store) {
                    fn.call(context, this.store[key], key);
                }
                /* eslint-enable guard-for-in */
            }
        }]);

        return ScopeModel;
    }(_Event3.default);

    exports.default = ScopeModel;

    /**
     * 设置单个属性值
     *
     * @param {ScopeModel} model 作为容器的Model对象
     * @param {string} name 属性名
     * @param {Mixed} value 对应的值
     * @return {meta.ChangeRecord} 一个变化记录项
     * @ignore
     */
    function setProperty(model, name, value) {
        var type = model.store.hasOwnProperty(name) ? 'change' : 'add';
        var oldValue = model.store[name];
        model.store[name] = value;

        // 只是粗略记录一下set了啥
        return {
            type: type,
            name: name,
            oldValue: oldValue,
            newValue: value
        };
    }

    /**
     * 自己触发的change事件，就要负责到底，即通知所有的子孙scope。
     *
     * @param {ScopeModel} rootModel model对象
     * @param {Array.<Object>} changes 值改变记录
     */
    function change(rootModel, changes) {
        var delayFns = getDelayFns(rootModel, 'change');
        (0, _utils.forEach)(delayFns, function (fn) {
            return fn();
        });

        function getDelayFns(model, eventName) {
            var delayFns = [];

            // 直接锁定model的所有事件回调函数，防止前面的事件回调函数污染回调函数队列。
            var handlers = model.getEventHandlers(eventName);
            if (handlers && handlers.length) {
                (0, _utils.forEach)(handlers, function (handler) {
                    delayFns.push(function () {
                        model.invokeEventHandler(handler, {
                            type: eventName,
                            model: rootModel,
                            changes: changes
                        });
                    });
                });
            }

            // 遍历子孙model
            for (var i = 0, il = model.children.length; i < il; ++i) {
                delayFns.push.apply(delayFns, getDelayFns(model.children[i], 'parentchange'));
            }

            return delayFns;
        }
    }
});
//# sourceMappingURL=/Users/baidu/elegant-view/vtpl/ScopeModel.js.map