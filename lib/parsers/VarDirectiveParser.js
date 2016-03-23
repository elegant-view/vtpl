define(['exports', './DirectiveParser'], function (exports, _DirectiveParser2) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _DirectiveParser3 = _interopRequireDefault(_DirectiveParser2);

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

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
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

    var VarDirectiveParser = function (_DirectiveParser) {
        _inherits(VarDirectiveParser, _DirectiveParser);

        function VarDirectiveParser(options) {
            _classCallCheck(this, VarDirectiveParser);

            var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(VarDirectiveParser).call(this, options));

            _this.node = options.node;
            _this.updateFn = null;

            _this.$$expr = null;
            _this.$$leftValueName = null;
            return _this;
        }

        _createClass(VarDirectiveParser, [{
            key: 'collectExprs',
            value: function collectExprs() {
                var nodeValue = this.node.getNodeValue();

                this.$$expr = '${' + nodeValue.slice(nodeValue.indexOf('=', 0) + 1) + '}';

                var exprWatcher = this.tree.getExprWatcher();
                exprWatcher.addExpr(this.$$expr);

                try {
                    this.$$leftValueName = nodeValue.match(/var:\s*([\w\$]+)=/)[1];
                } catch (e) {
                    throw new Error('wrong var expression ' + this.$$leftValueName);
                }
            }
        }, {
            key: 'linkScope',
            value: function linkScope() {
                var _this2 = this;

                var exprWatcher = this.tree.getExprWatcher();
                exprWatcher.on('change', function (event) {
                    if (!_this2.isGoDark && event.expr === _this2.$$expr) {
                        _this2.tree.rootScope.set(_this2.$$leftValueName, exprWatcher.calculate(_this2.$$expr));
                    }
                });
            }
        }, {
            key: 'initRender',
            value: function initRender() {
                var exprWatcher = this.tree.getExprWatcher();
                this.tree.rootScope.set(this.$$leftValueName, exprWatcher.calculate(this.$$expr));
            }
        }, {
            key: 'getStartNode',
            value: function getStartNode() {
                return this.node;
            }
        }, {
            key: 'getEndNode',
            value: function getEndNode() {
                return this.node;
            }
        }, {
            key: 'goDark',
            value: function goDark() {
                this.isGoDark = true;
            }
        }, {
            key: 'restoreFromDark',
            value: function restoreFromDark() {
                this.isGoDark = false;
            }
        }], [{
            key: 'isProperNode',
            value: function isProperNode(node, config) {
                var nodeValue = node.getNodeValue();
                return _DirectiveParser3.default.isProperNode(node) && nodeValue.replace(/^\s+/, '').indexOf(config.varName + ':') === 0;
            }
        }]);

        return VarDirectiveParser;
    }(_DirectiveParser3.default);

    exports.default = VarDirectiveParser;
});