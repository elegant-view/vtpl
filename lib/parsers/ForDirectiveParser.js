define(['exports', './DirectiveParser', '../utils', '../nodes/Node'], function (exports, _DirectiveParser2, _utils, _Node) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _DirectiveParser3 = _interopRequireDefault(_DirectiveParser2);

    var _Node2 = _interopRequireDefault(_Node);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    var _slicedToArray = function () {
        function sliceIterator(arr, i) {
            var _arr = [];
            var _n = true;
            var _d = false;
            var _e = undefined;

            try {
                for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
                    _arr.push(_s.value);

                    if (i && _arr.length === i) break;
                }
            } catch (err) {
                _d = true;
                _e = err;
            } finally {
                try {
                    if (!_n && _i["return"]) _i["return"]();
                } finally {
                    if (_d) throw _e;
                }
            }

            return _arr;
        }

        return function (arr, i) {
            if (Array.isArray(arr)) {
                return arr;
            } else if (Symbol.iterator in Object(arr)) {
                return sliceIterator(arr, i);
            } else {
                throw new TypeError("Invalid attempt to destructure non-iterable instance");
            }
        };
    }();

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

    var ForDirectiveParser = function (_DirectiveParser) {
        _inherits(ForDirectiveParser, _DirectiveParser);

        function ForDirectiveParser(options) {
            _classCallCheck(this, ForDirectiveParser);

            var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ForDirectiveParser).call(this, options));

            _this.startNode = options.startNode;
            _this.endNode = options.endNode;

            _this.tplSeg = null;
            _this.expr = null;
            _this.updateFn = null;
            _this.trees = [];
            _this.$$itemVariableName = null;
            return _this;
        }

        _createClass(ForDirectiveParser, [{
            key: 'collectExprs',
            value: function collectExprs() {
                // for指令之间没有节点，啥也不干
                if (this.startNode.getNextSibling().equal(this.endNode)) {
                    return;
                }

                // 将for指令之间的节点抽出来，放在tplSeg里面作为样板缓存，后面会根据这个样板生成具体的DOM结构。
                var nodesManager = this.tree.getTreeVar('nodesManager');
                this.tplSeg = nodesManager.createDocumentFragment('div');
                for (var curNode = this.startNode.getNextSibling(); curNode && !curNode.isAfter(this.endNode.getPreviousSibling());) {
                    var nextNode = curNode.getNextSibling();
                    this.tplSeg.appendChild(curNode);
                    curNode = nextNode;
                }

                var expr = this.startNode.getNodeValue().replace('for:', '');
                try {
                    var _expr$match = expr.match(/^\s*([$\w.\[\]]+)\s+as\s+([$\w]+)\s*$/);

                    var _expr$match2 = _slicedToArray(_expr$match, 3);

                    this.listExpr = _expr$match2[1];
                    this.$$itemVariableName = _expr$match2[2];
                } catch (error) {
                    throw new Error('wrong for expression ' + expr);
                }

                var exprWatcher = this.tree.getExprWatcher();
                this.listExpr = '${' + this.listExpr + '}';
                exprWatcher.addExpr(this.listExpr);

                this.updateFn = this.createUpdateFn(this.startNode.getNextSibling(), this.endNode.getPreviousSibling());
            }
        }, {
            key: 'linkScope',
            value: function linkScope() {
                var _this2 = this;

                var exprWatcher = this.tree.getExprWatcher();
                exprWatcher.on('change', function (event) {
                    if (!_this2.isGoDark && event.expr === _this2.listExpr) {
                        _this2.updateFn(event.newValue);
                    }
                });
            }
        }, {
            key: 'initRender',
            value: function initRender() {
                var exprWatcher = this.tree.getExprWatcher();
                this.updateFn(exprWatcher.calculate(this.listExpr));
            }
        }, {
            key: 'createUpdateFn',
            value: function createUpdateFn(startNode, endNode) {
                var parser = this;
                var itemVariableName = this.$$itemVariableName;
                return function (listObj) {
                    var index = 0;
                    /* eslint-disable guard-for-in */
                    for (var k in listObj) {
                        /* eslint-enable guard-for-in */
                        var local = {
                            key: k,
                            index: index
                        };
                        local[itemVariableName] = listObj[k];

                        if (!parser.trees[index]) {
                            parser.trees[index] = parser.createTree();
                            parser.trees[index].compile();
                            parser.trees[index].link();
                            parser.trees[index].initRender();
                        }

                        parser.trees[index].restoreFromDark();
                        parser.trees[index].rootScope.set(local);

                        ++index;
                    }

                    for (var i = index, il = parser.trees.length; i < il; ++i) {
                        parser.trees[i].goDark();
                    }
                };
            }
        }, {
            key: 'goDark',
            value: function goDark() {
                if (this.isGoDark) {
                    return;
                }
                (0, _utils.forEach)(this.trees, function (tree) {
                    return tree.goDark();
                });
                this.isGoDark = true;
            }
        }, {
            key: 'restoreFromDark',
            value: function restoreFromDark() {
                if (!this.isGoDark) {
                    return;
                }

                var exprWatcher = this.tree.getExprWatcher();
                this.updateFn(exprWatcher.calculate(this.listExpr));

                this.isGoDark = false;
            }
        }, {
            key: 'destroy',
            value: function destroy() {
                (0, _utils.forEach)(this.trees, function (tree) {
                    return tree.destroy();
                });

                this.tplSeg = null;
                this.expr = null;
                this.exprFn = null;
                this.updateFn = null;
                this.startNode = null;
                this.endNode = null;

                _get(Object.getPrototypeOf(ForDirectiveParser.prototype), 'destroy', this).call(this);
            }
        }, {
            key: 'createTree',
            value: function createTree() {
                var parser = this;
                var nodesManager = this.tree.getTreeVar('nodesManager');
                var copySeg = nodesManager.createDocumentFragment('div');
                copySeg.setInnerHTML(this.tplSeg.getInnerHTML());

                var childNodes = copySeg.getChildNodes();
                var startNode = childNodes[0];
                var endNode = childNodes[childNodes.length - 1];

                var curNode = startNode;
                while (curNode && !curNode.isAfter(endNode)) {
                    var nextNode = curNode.getNextSibling();
                    parser.endNode.getParentNode().insertBefore(curNode, parser.endNode);
                    curNode = nextNode;
                }

                var tree = _get(Object.getPrototypeOf(ForDirectiveParser.prototype), 'createTree', this).call(this, this.tree, startNode, endNode);
                return tree;
            }
        }, {
            key: 'getChildNodes',
            value: function getChildNodes() {
                return [];
            }
        }, {
            key: 'getEndNode',
            value: function getEndNode() {
                return this.endNode;
            }
        }, {
            key: 'getStartNode',
            value: function getStartNode() {
                return this.startNode;
            }
        }], [{
            key: 'isProperNode',
            value: function isProperNode(node, config) {
                return _DirectiveParser3.default.isProperNode(node, config) && config.forPrefixRegExp.test(node.getNodeValue());
            }
        }, {
            key: 'isEndNode',
            value: function isEndNode(node, config) {
                var nodeType = node.getNodeType();
                return nodeType === _Node2.default.COMMENT_NODE && config.forEndPrefixRegExp.test(node.getNodeValue());
            }
        }, {
            key: 'findEndNode',
            value: function findEndNode() {
                return this.walkToEnd.apply(this, arguments);
            }
        }, {
            key: 'getNoEndNodeError',
            value: function getNoEndNodeError() {
                return new Error('the `for` directive is not properly ended!');
            }
        }]);

        return ForDirectiveParser;
    }(_DirectiveParser3.default);

    exports.default = ForDirectiveParser;
});