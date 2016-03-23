var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

define(['exports', './Parser', '../nodes/Node'], function (exports, _Parser2, _Node) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _Parser3 = _interopRequireDefault(_Parser2);

    var _Node2 = _interopRequireDefault(_Node);

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

    var DirectiveParser = function (_Parser) {
        _inherits(DirectiveParser, _Parser);

        function DirectiveParser(options) {
            _classCallCheck(this, DirectiveParser);

            var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(DirectiveParser).call(this, options));

            _this.node = options.node;
            return _this;
        }

        /**
         * 根据父级数创建子树。
         *
         * @protected
         * @param  {Tree} parentTree 父级树
         * @param {nodes/Node} startNode 开始节点
         * @param {nodes/Node} endNode 结束节点
         * @return {Tree}  创建好的子树
         */

        _createClass(DirectiveParser, [{
            key: 'createTree',
            value: function createTree(parentTree, startNode, endNode) {
                var tree = this.tree.createTree({
                    startNode: startNode,
                    endNode: endNode
                });
                tree.setParent(parentTree);
                tree.rootScope.setParent(parentTree.rootScope);
                parentTree.rootScope.addChild(tree.rootScope);
                return tree;
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
            key: 'destroy',
            value: function destroy() {
                this.node = null;

                _get(Object.getPrototypeOf(DirectiveParser.prototype), 'destroy', this).call(this);
            }
        }], [{
            key: 'isProperNode',
            value: function isProperNode(node, config) {
                return node.getNodeType() === _Node2.default.COMMENT_NODE;
            }
        }, {
            key: 'isEndNode',
            value: function isEndNode() {
                return true;
            }
        }, {
            key: 'walkToEnd',
            value: function walkToEnd(startNode, config) {
                var curNode = startNode;
                // 为了应对指令嵌套
                var stackCounter = 0;
                while (curNode = curNode.getNextSibling()) {
                    if (this.isProperNode(curNode, config)) {
                        ++stackCounter;
                    }

                    if (this.isEndNode(curNode, config)) {
                        if (stackCounter === 0) {
                            return curNode;
                        }
                        --stackCounter;
                    }
                }
            }
        }]);

        return DirectiveParser;
    }(_Parser3.default);

    exports.default = DirectiveParser;
});
//# sourceMappingURL=/Users/baidu/elegant-view/vtpl/parsers/DirectiveParser.js.map