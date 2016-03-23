define(['exports', '../ScopeModel', './Parser', '../utils', '../nodes/Node'], function (exports, _ScopeModel, _Parser2, _utils, _Node) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _ScopeModel2 = _interopRequireDefault(_ScopeModel);

    var _Parser3 = _interopRequireDefault(_Parser2);

    var _Node2 = _interopRequireDefault(_Node);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
        return typeof obj;
    } : function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
    };

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

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

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

    var ExprParser = function (_Parser) {
        _inherits(ExprParser, _Parser);

        /**
         * 初始化
         *
         * @inheritDoc
         * @param  {Object} options 参数
         * @param  {Node} options.node 要解析的DOM节点
         */

        function ExprParser(options) {
            _classCallCheck(this, ExprParser);

            var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ExprParser).call(this, options));

            _this.node = options.node;

            _this.isGoDark = false;

            _this.$exprUpdateFns = {};
            return _this;
        }

        /**
         * 搜集过程
         *
         * @public
         */


        _createClass(ExprParser, [{
            key: 'collectExprs',
            value: function collectExprs() {
                var _this2 = this;

                var nodeType = this.node.getNodeType();
                var domUpdater = this.tree.getTreeVar('domUpdater');
                var exprWatcher = this.tree.getExprWatcher();

                // 文本节点
                if (nodeType === _Node2.default.TEXT_NODE) {
                    var nodeValue = this.node.getNodeValue();
                    if (isExpr(nodeValue)) {
                        exprWatcher.addExpr(nodeValue);

                        var updateFns = this.$exprUpdateFns[nodeValue] || [];
                        updateFns.push(function (exprValue, callback) {
                            var parser = _this2;
                            domUpdater.addTaskFn(_this2.getTaskId('nodeValue'), function () {
                                parser.setAttr('nodeValue', exprValue);
                                callback && callback();
                            });
                        });
                        this.$exprUpdateFns[nodeValue] = updateFns;
                    }
                    return;
                }

                // 元素节点
                if (nodeType === _Node2.default.ELEMENT_NODE) {
                    (function () {
                        var attributes = _this2.node.getAttributes();
                        var attrs = {};
                        for (var i = 0, il = attributes.length; i < il; ++i) {
                            var attribute = attributes[i];
                            attrs[(0, _utils.line2camel)(attribute.name)] = true;

                            if (!isExpr.call(_this2, attribute.value)) {
                                _this2.setAttr(attribute.name, attribute.value);
                                continue;
                            }

                            if (_Node2.default.isEventName(attribute.name) || attribute.name === 'on-outclick') {
                                _this2.setEvent(attribute.name, attribute.value);
                            } else {
                                exprWatcher.addExpr(attribute.value);

                                var updateFns = _this2.$exprUpdateFns[attribute.value] || [];
                                attribute.name === 'd-rest' ? updateFns.push(function (value) {
                                    return _this2.setRestAttrs(value, attrs);
                                }) : updateFns.push((0, _utils.bind)(updateAttr, _this2, _this2.getTaskId(attribute.name), domUpdater, attribute.name));
                                _this2.$exprUpdateFns[attribute.value] = updateFns;
                            }
                        }
                    })();
                }

                function updateAttr(taskId, domUpdater, attrName, exprValue, callback) {
                    var _this3 = this;

                    domUpdater.addTaskFn(taskId, function () {
                        _this3.setAttr(attrName, exprValue);
                        callback && callback();
                    });
                }

                function isExpr(expr) {
                    return (/\$\{(.+?)}/.test(expr)
                    );
                }
            }
        }, {
            key: 'setRestAttrs',
            value: function setRestAttrs(value, attrs) {
                if (!value || (typeof value === 'undefined' ? 'undefined' : _typeof(value)) !== 'object') {
                    return;
                }

                for (var key in value) {
                    if (!(key in attrs)) {
                        this.setAttr(key, value[key]);
                    }
                }
            }
        }, {
            key: 'setEvent',
            value: function setEvent(attrName, attrValue) {
                var _this4 = this;

                if (!attrValue) {
                    return;
                }

                var eventName = attrName.replace('on-', '');
                this.node.off(eventName);
                this.node.on(eventName, function (event) {
                    attrValue = attrValue.replace(/^\${|}$/g, '');

                    var exprCalculater = _this4.tree.getTreeVar('exprCalculater');
                    exprCalculater.createExprFn(attrValue, true);

                    var localScope = new _ScopeModel2.default();
                    localScope.setParent(_this4.tree.rootScope);
                    localScope.set('event', event);
                    exprCalculater.calculate(attrValue, true, localScope, true);
                });
            }
        }, {
            key: 'setAttr',
            value: function setAttr(attrName, attrValue) {
                if (attrName === 'nodeValue') {
                    this.setNodeValue(attrValue);
                } else {
                    this.node.attr(attrName, attrValue);
                }
            }
        }, {
            key: 'setNodeValue',
            value: function setNodeValue(value) {
                if ((0, _utils.isPureObject)(value) && value.type === 'html') {
                    var nodesManager = this.tree.getTreeVar('nodesManager');
                    var fragment = nodesManager.createDocumentFragment();
                    fragment.setInnerHTML(value.html);
                    var childNodes = fragment.getChildNodes();

                    var baseNode = void 0;
                    if (this.startNode && this.endNode) {
                        baseNode = this.startNode;
                    } else {
                        baseNode = this.node;
                    }

                    var _iteratorNormalCompletion = true;
                    var _didIteratorError = false;
                    var _iteratorError = undefined;

                    try {
                        for (var _iterator = childNodes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                            var childNode = _step.value;

                            baseNode.getParentNode().insertBefore(childNode, baseNode);
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

                    this.node.setNodeValue('');
                    removeNodes(this.startNode, this.endNode);

                    this.startNode = childNodes[0];
                    this.endNode = childNodes[childNodes.length - 1];
                } else {
                    if (this.startNode && this.endNode) {
                        removeNodes(this.startNode, this.endNode);
                        this.startNode = this.endNode = null;
                    }

                    this.node.setNodeValue(value);
                }

                function removeNodes(startNode, endNode) {
                    var delayFns = [];
                    for (var curNode = startNode; curNode && !curNode.isAfter(endNode); curNode = curNode.getNextSibling()) {
                        delayFns.push((0, _utils.bind)(function (curNode) {
                            return curNode.remove();
                        }, null, curNode));
                    }
                    var _iteratorNormalCompletion2 = true;
                    var _didIteratorError2 = false;
                    var _iteratorError2 = undefined;

                    try {
                        for (var _iterator2 = delayFns[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                            var fn = _step2.value;

                            fn();
                        }
                    } catch (err) {
                        _didIteratorError2 = true;
                        _iteratorError2 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion2 && _iterator2.return) {
                                _iterator2.return();
                            }
                        } finally {
                            if (_didIteratorError2) {
                                throw _iteratorError2;
                            }
                        }
                    }
                }
            }
        }, {
            key: 'linkScope',
            value: function linkScope() {
                var _this5 = this;

                var exprWatcher = this.tree.getExprWatcher();
                exprWatcher.on('change', function (event) {
                    var updateFns = _this5.$exprUpdateFns[event.expr];
                    // 此处并不会处理isGoDark为true的情况，因为Node那边处理了。
                    if (updateFns && updateFns.length) {
                        (0, _utils.forEach)(updateFns, function (fn) {
                            return fn(event.newValue);
                        });
                    }
                });
            }
        }, {
            key: 'initRender',
            value: function initRender() {
                var exprWatcher = this.tree.getExprWatcher();
                (0, _utils.forEach)(this.$exprUpdateFns, function (fns, expr) {
                    (0, _utils.forEach)(fns, function (fn) {
                        return fn(exprWatcher.calculate(expr));
                    });
                });
            }
        }, {
            key: 'getStartNode',
            value: function getStartNode() {
                if (this.startNode) {
                    return this.startNode;
                }

                return this.node;
            }
        }, {
            key: 'getEndNode',
            value: function getEndNode() {
                if (this.endNode) {
                    return this.endNode;
                }

                return this.node;
            }
        }, {
            key: 'destroy',
            value: function destroy() {
                this.node = null;
                this.$exprUpdateFns = null;

                _get(Object.getPrototypeOf(ExprParser.prototype), 'destroy', this).call(this);
            }
        }, {
            key: 'goDark',
            value: function goDark() {
                var _this6 = this;

                if (this.isGoDark) {
                    return;
                }
                // 前面故意保留一个空格，因为DOM中不可能出现节点的属性key第一个字符为空格的，
                // 避免了冲突。
                var taskId = this.getTaskId(' hide');
                var domUpdater = this.tree.getTreeVar('domUpdater');
                domUpdater.addTaskFn(taskId, function () {
                    return _this6.node.hide();
                });

                this.isGoDark = true;
            }
        }, {
            key: 'restoreFromDark',
            value: function restoreFromDark() {
                var _this7 = this;

                if (!this.isGoDark) {
                    return;
                }
                var taskId = this.getTaskId(' hide');
                var domUpdater = this.tree.getTreeVar('domUpdater');
                domUpdater.addTaskFn(taskId, function () {
                    return _this7.node.show();
                });

                this.isGoDark = false;
            }
        }, {
            key: 'getTaskId',
            value: function getTaskId(attrName) {
                return this.tree.getTreeVar('domUpdater').generateNodeAttrUpdateId(this.node, attrName);
            }
        }], [{
            key: 'isProperNode',
            value: function isProperNode(node) {
                var nodeType = node.getNodeType();
                return nodeType === _Node2.default.ELEMENT_NODE || nodeType === _Node2.default.TEXT_NODE;
            }
        }]);

        return ExprParser;
    }(_Parser3.default);

    exports.default = ExprParser;
});