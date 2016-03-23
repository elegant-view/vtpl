var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

define(['exports', '../utils', '../ScopeModel', '../Base', '../nodes/Node', '../ExprWatcher', '../parsers/parserState'], function (exports, _utils, _ScopeModel, _Base2, _Node, _ExprWatcher, _parserState) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _ScopeModel2 = _interopRequireDefault(_ScopeModel);

    var _Base3 = _interopRequireDefault(_Base2);

    var _Node2 = _interopRequireDefault(_Node);

    var _ExprWatcher2 = _interopRequireDefault(_ExprWatcher);

    var _parserState2 = _interopRequireDefault(_parserState);

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

    var Tree = function (_Base) {
        _inherits(Tree, _Base);

        /**
         * 树的初始化方法。
         *
         * @protected
         * @param  {Object} options 初始化参数
         * @param {nodes/Node} options.startNode 这棵树要解析的dom块的开始节点
         * @param {nodes/Node} options.endNode 这棵树要解析的dom块的结束节点
         */

        function Tree(options) {
            _classCallCheck(this, Tree);

            var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Tree).call(this, options));

            _this.startNode = options.startNode;
            _this.endNode = options.endNode;

            _this.treeVars = {};
            _this.$parsers = [];
            _this.$parent = null;
            _this.$$nodeIdParserMap = {};

            _this.rootScope = new _ScopeModel2.default();

            _this.$exprWatcher = null;
            return _this;
        }

        /**
         * 设置绑定在树上面的额外变量。这些变量有如下特性：
         * 1、无法覆盖；
         * 2、在获取treeVars上面某个变量的时候，如果当前树取出来是undefined，那么就会到父级树的treeVars上去找，以此类推。
         *
         * @public
         * @param {string} name  变量名
         * @param {*} value 变量值
         * @return {boolean} 是否设置成功
         */

        _createClass(Tree, [{
            key: 'setTreeVar',
            value: function setTreeVar(name, value) {
                if (this.treeVars[name] !== undefined) {
                    return false;
                }
                this.treeVars[name] = value;
                return true;
            }
        }, {
            key: 'unsetTreeVar',
            value: function unsetTreeVar(name) {
                this.treeVars[name] = undefined;
            }
        }, {
            key: 'getTreeVar',
            value: function getTreeVar(name, shouldNotFindInParent) {
                var val = this.treeVars[name];
                if (!shouldNotFindInParent && val === undefined && this.$parent) {
                    val = this.$parent.getTreeVar(name);
                }
                return val;
            }
        }, {
            key: 'setParent',
            value: function setParent(parent) {
                this.$parent = parent;
            }
        }, {
            key: 'getExprWatcher',
            value: function getExprWatcher() {
                return this.$exprWatcher;
            }
        }, {
            key: 'getParsers',
            value: function getParsers() {
                return this.$parsers;
            }
        }, {
            key: 'compile',
            value: function compile() {
                var _this2 = this;

                this.$exprWatcher = new _ExprWatcher2.default(this.rootScope, this.getTreeVar('exprCalculater'));

                var delayFns = [];
                _Node2.default.iterate(this.startNode, this.endNode, function (node) {
                    var options = {
                        startNode: node,
                        node: node,
                        tree: _this2
                    };

                    var parser = undefined;
                    var ParserClasses = _this2.getTreeVar('parserClasses');
                    for (var i = 0, il = ParserClasses.length; i < il; ++i) {
                        var ParserClass = ParserClasses[i];
                        parser = _this2.createParser(ParserClass, options);

                        if (!parser) {
                            continue;
                        }
                        _this2.$parsers.push(parser);
                        break;
                    }

                    if (!parser) {
                        throw new Error('no such parser');
                    }

                    delayFns.push(handle);

                    function handle() {
                        parser.$state = _parserState2.default.BEGIN_COMPILING;
                        parser.collectExprs();
                        parser.$state = _parserState2.default.END_COMPILING;
                    }

                    return {
                        type: 'options',
                        getNextNode: function getNextNode(curNode) {
                            return parser.getEndNode().getNextSibling();
                        },
                        getChildNodes: function getChildNodes(curNode) {
                            if (parser.getChildNodes instanceof Function) {
                                return parser.getChildNodes();
                            }
                            return curNode.getChildNodes();
                        }
                    };
                });

                for (var i = 0, il = delayFns.length; i < il; ++i) {
                    delayFns[i]();
                }
            }
        }, {
            key: 'link',
            value: function link() {
                for (var i = 0, il = this.$parsers.length; i < il; ++i) {
                    var parser = this.$parsers[i];
                    // 将解析器对象和对应树的scope绑定起来
                    parser.$state = _parserState2.default.BEGIN_LINK;
                    parser.linkScope();
                    parser.$state = _parserState2.default.END_LINK;
                }
            }
        }, {
            key: 'initRender',
            value: function initRender() {
                for (var i = 0, il = this.$parsers.length; i < il; ++i) {
                    var parser = this.$parsers[i];
                    // 将解析器对象和对应树的scope绑定起来
                    parser.$state = _parserState2.default.BEGIN_INIT_RENDER;
                    parser.initRender();
                    parser.$state = _parserState2.default.READY;
                }

                this.$exprWatcher.start();
            }
        }, {
            key: 'goDark',
            value: function goDark() {
                // 调用这棵树下面所有解析器的goDark方法
                (0, _utils.forEach)(this.$parsers, function (parser) {
                    return parser.goDark();
                });
                this.$exprWatcher.stop();
            }
        }, {
            key: 'restoreFromDark',
            value: function restoreFromDark() {
                (0, _utils.forEach)(this.$parsers, function (parser) {
                    return parser.restoreFromDark();
                });
                this.$exprWatcher.resume();
            }
        }, {
            key: 'destroy',
            value: function destroy() {
                walk(this.$parsers);

                this.startNode = null;
                this.endNode = null;
                this.config = null;

                this.$parser = null;
                this.treeVars = null;

                this.$$nodeIdParserMap = null;

                function walk(parsers) {
                    (0, _utils.each)(parsers, function (parser) {
                        parser.destroy();
                        parser.$state = _parserState2.default.DESTROIED;
                    });
                }
            }
        }, {
            key: 'createParser',
            value: function createParser(ParserClass, options) {
                var startNode = options.startNode || options.node;
                var config = this.getTreeVar('config');
                if (!ParserClass.isProperNode(startNode, config)) {
                    return;
                }

                var endNode = undefined;
                if (ParserClass.findEndNode) {
                    endNode = ParserClass.findEndNode(startNode, config);

                    if (!endNode) {
                        throw ParserClass.getNoEndNodeError();
                    } else if (endNode.parentNode !== startNode.parentNode) {
                        throw new Error('the relationship between start node and end node is not brotherhood!');
                    }
                }

                var parser = new ParserClass((0, _utils.extend)(options, {
                    endNode: endNode
                }));

                var key = !endNode || startNode.equal(endNode) ? startNode.getNodeId() : startNode.getNodeId() + '-' + endNode.getNodeId();
                this.$$nodeIdParserMap[key] = parser;

                return parser;
            }
        }, {
            key: 'createTree',
            value: function createTree(options) {
                return new Tree(options);
            }
        }]);

        return Tree;
    }(_Base3.default);

    exports.default = Tree;
});
//# sourceMappingURL=/Users/baidu/elegant-view/vtpl/trees/Tree.js.map