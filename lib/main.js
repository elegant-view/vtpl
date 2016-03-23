define(['exports', './parsers/ForDirectiveParser', './parsers/IfDirectiveParser', './parsers/DirectiveParser', './parsers/ExprParser', './parsers/VarDirectiveParser', './trees/Tree', './ExprCalculater', './DomUpdater', './utils', './Config', './nodes/NodesManager', './parsers/Parser'], function (exports, _ForDirectiveParser, _IfDirectiveParser, _DirectiveParser, _ExprParser, _VarDirectiveParser, _Tree, _ExprCalculater, _DomUpdater, _utils, _Config, _NodesManager, _Parser) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _ForDirectiveParser2 = _interopRequireDefault(_ForDirectiveParser);

    var _IfDirectiveParser2 = _interopRequireDefault(_IfDirectiveParser);

    var _DirectiveParser2 = _interopRequireDefault(_DirectiveParser);

    var _ExprParser2 = _interopRequireDefault(_ExprParser);

    var _VarDirectiveParser2 = _interopRequireDefault(_VarDirectiveParser);

    var _Tree2 = _interopRequireDefault(_Tree);

    var _ExprCalculater2 = _interopRequireDefault(_ExprCalculater);

    var _DomUpdater2 = _interopRequireDefault(_DomUpdater);

    var _Config2 = _interopRequireDefault(_Config);

    var _NodesManager2 = _interopRequireDefault(_NodesManager);

    var _Parser2 = _interopRequireDefault(_Parser);

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

    var VTpl = function () {
        function VTpl(options) {
            _classCallCheck(this, VTpl);

            options = (0, _utils.extend)({
                config: new _Config2.default()
            }, options);

            this.$nodesManager = new _NodesManager2.default();
            if (options.startNode) {
                options.startNode = this.$nodesManager.getNode(options.startNode);
            }
            if (options.endNode) {
                options.endNode = this.$nodesManager.getNode(options.endNode);
            }
            if (options.node) {
                options.node = this.$nodesManager.getNode(options.node);
            }

            this.$options = options;

            var tree = new _Tree2.default(this.$options);
            tree.setTreeVar('exprCalculater', new _ExprCalculater2.default());
            tree.setTreeVar('domUpdater', new _DomUpdater2.default());
            tree.setTreeVar('config', this.$options.config);
            tree.setTreeVar('nodesManager', this.$nodesManager);
            tree.setTreeVar('parserClasses', []);
            this.$tree = tree;

            // 注册一批解析器
            this.registerParser(_ForDirectiveParser2.default);
            this.registerParser(_IfDirectiveParser2.default);
            this.registerParser(_DirectiveParser2.default);
            this.registerParser(_ExprParser2.default);
            this.registerParser(_VarDirectiveParser2.default);
        }

        _createClass(VTpl, [{
            key: 'setExprEqualFn',
            value: function setExprEqualFn(expr, handler) {
                var exprWatcher = this.$tree.getExprWatcher();
                exprWatcher.setExprEqualFn(expr, handler);
            }
        }, {
            key: 'setExprCloneFn',
            value: function setExprCloneFn(expr, handler) {
                var exprWatcher = this.$tree.getExprWatcher();
                exprWatcher.setExprCloneFn(expr, handler);
            }
        }, {
            key: 'registerParser',
            value: function registerParser(parserClass) {
                if (!(0, _utils.isSubClassOf)(parserClass, _Parser2.default)) {
                    throw new TypeError('wrong parser class');
                }

                var parserClasses = this.$tree.getTreeVar('parserClasses');
                var hasInserted = false;
                for (var i in parserClasses) {
                    var klass = parserClasses[i];
                    if ((0, _utils.isSubClassOf)(parserClass, klass)) {
                        hasInserted = true;
                        parserClasses.splice(i, 0, parserClass);
                        break;
                    }
                }
                if (!hasInserted) {
                    parserClasses.push(parserClass);
                }
            }
        }, {
            key: 'render',
            value: function render() {
                this.$tree.compile();
                this.$tree.link();
                this.$tree.getTreeVar('domUpdater').start();
                this.$tree.initRender();
            }
        }, {
            key: 'setData',
            value: function setData() {
                var scope = this.$tree.rootScope;

                for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                    args[_key] = arguments[_key];
                }

                scope.set.apply(scope, args);
            }
        }, {
            key: 'destroy',
            value: function destroy() {
                this.$tree.getTreeVar('exprCalculater').destroy();
                this.$tree.getTreeVar('domUpdater').destroy();

                this.$tree.destroy();
                this.$nodesManager.destroy();

                this.$nodesManager = null;
                this.$options = null;
                this.$tree = null;
            }
        }]);

        return VTpl;
    }();

    exports.default = VTpl;
});