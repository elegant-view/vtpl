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

    var IfDirectiveParser = function (_DirectiveParser) {
        _inherits(IfDirectiveParser, _DirectiveParser);

        function IfDirectiveParser(options) {
            _classCallCheck(this, IfDirectiveParser);

            var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(IfDirectiveParser).call(this, options));

            _this.startNode = options.startNode;
            _this.endNode = options.endNode;

            _this.exprs = [];
            _this.$branchTrees = [];

            _this.isGoDark = false;
            return _this;
        }

        _createClass(IfDirectiveParser, [{
            key: 'collectExprs',
            value: function collectExprs() {
                var _this2 = this;

                var branchNodeStack = [];
                // 这个计数器是用来处理if指令嵌套问题的。
                // 当nestCounter为0的时候，遇到的各种if相关指令才属于当前parser的，
                // 否则是嵌套的if指令
                var nestCounter = 0;
                var config = this.tree.getTreeVar('config');
                _Node2.default.iterate(this.startNode, this.endNode, function (node) {
                    var ifNodeType = getIfNodeType(node, _this2.tree.getTreeVar('config'));
                    // if
                    if (ifNodeType === IfDirectiveParser.IF_START) {
                        // 已经有了一个if分支，再来一个if分支，说明很可能是if嵌套
                        if (branchNodeStack.length) {
                            ++nestCounter;
                            return;
                        }

                        branchNodeStack.push({ node: node, type: ifNodeType });
                    }
                    // elif
                    else if (ifNodeType === IfDirectiveParser.ELIF || ifNodeType === IfDirectiveParser.ELSE) {
                            // 有嵌套，就不管这个分支了
                            if (nestCounter) {
                                return;
                            }

                            if (!branchNodeStack.length ||
                            // 前面一个分支既不是`if`，也不是`elif`
                            branchNodeStack[branchNodeStack.length - 1].type !== IfDirectiveParser.IF_START && branchNodeStack[branchNodeStack.length - 1].type !== IfDirectiveParser.ELIF) {
                                throw new Error('wrong `if` directive syntax');
                            }
                            branchNodeStack.push({ node: node, type: ifNodeType });
                        }
                        // /if
                        else if (ifNodeType === IfDirectiveParser.IF_END) {
                                // 有嵌套，此时要退出一层嵌套
                                if (nestCounter) {
                                    --nestCounter;
                                    return;
                                }

                                branchNodeStack.push({ node: node, type: ifNodeType });
                            }

                    // 是 if 节点或者 elif 节点，搜集表达式
                    if (ifNodeType === IfDirectiveParser.IF_START || ifNodeType === IfDirectiveParser.ELIF) {
                        var expr = '${' + node.getNodeValue().replace(config.getAllIfRegExp(), '') + '}';
                        expr = expr.replace(/\n/g, ' ');
                        _this2.exprs.push(expr);

                        var exprWatcher = _this2.tree.getExprWatcher();
                        exprWatcher.addExpr(expr);
                    }

                    if (ifNodeType === IfDirectiveParser.ELSE) {
                        _this2.$$hasElseBranch = true;
                    }
                });

                for (var i = 0, il = branchNodeStack.length - 1; i < il; ++i) {
                    var curNode = branchNodeStack[i];
                    var nextNode = branchNodeStack[i + 1];

                    var curNodeNextSibling = curNode.node.getNextSibling();
                    // curNode 和 nextNode 之间没有节点
                    if (curNodeNextSibling.equal(nextNode.node)) {
                        this.$branchTrees.push(null);
                    } else {
                        var branchTree = this.tree.createTree({
                            startNode: curNodeNextSibling,
                            endNode: nextNode.node.getPreviousSibling()
                        });
                        branchTree.setParent(this.tree);

                        this.$branchTrees.push(branchTree);
                        branchTree.compile();

                        this.tree.rootScope.addChild(branchTree.rootScope);
                        branchTree.rootScope.setParent(this.tree.rootScope);
                    }
                }
            }
        }, {
            key: 'linkScope',
            value: function linkScope() {
                var _this3 = this;

                var exprWatcher = this.tree.getExprWatcher();

                for (var i = 0, il = this.$branchTrees.length; i < il; ++i) {
                    this.$branchTrees[i].link();
                }

                exprWatcher.on('change', function (event) {
                    if (_this3.isGoDark) {
                        return;
                    }

                    var hasExpr = false;
                    for (var i = 0, il = _this3.exprs.length; i < il; ++i) {
                        if (_this3.exprs[i] === event.expr) {
                            hasExpr = true;
                            break;
                        }
                    }

                    if (!hasExpr) {
                        return;
                    }

                    _this3.renderDOM(_this3);
                });
            }
        }, {
            key: 'initRender',
            value: function initRender() {
                this.renderDOM(this);

                for (var i = 0, il = this.$branchTrees.length; i < il; ++i) {
                    this.$branchTrees[i].initRender();
                }
            }
        }, {
            key: 'renderDOM',
            value: function renderDOM() {
                if (this.isGoDark) {
                    return;
                }

                var exprWatcher = this.tree.getExprWatcher();
                var exprs = this.exprs;
                var hasShowBranch = false;
                var i = 0;
                for (var il = exprs.length; i < il; ++i) {
                    var expr = exprs[i];
                    var exprValue = exprWatcher.calculate(expr);
                    var branchTree = this.$branchTrees[i];
                    if (exprValue) {
                        hasShowBranch = true;
                        branchTree.restoreFromDark();
                    } else {
                        branchTree.goDark();
                    }
                }

                if (this.$$hasElseBranch) {
                    this.$branchTrees[i][hasShowBranch ? 'goDark' : 'restoreFromDark']();
                }
            }
        }, {
            key: 'getChildNodes',
            value: function getChildNodes() {
                return [];
            }
        }, {
            key: 'destroy',
            value: function destroy() {
                for (var i = 0, il = this.$branchTrees.length; i < il; ++i) {
                    var branchTree = this.$branchTrees[i];
                    branchTree.destroy();
                }

                this.startNode = null;
                this.endNode = null;
                this.exprs = null;
                this.$branchTrees = null;

                _get(Object.getPrototypeOf(IfDirectiveParser.prototype), 'destroy', this).call(this);
            }
        }, {
            key: 'getStartNode',
            value: function getStartNode() {
                return this.startNode;
            }
        }, {
            key: 'getEndNode',
            value: function getEndNode() {
                return this.endNode;
            }
        }, {
            key: 'goDark',
            value: function goDark() {
                if (this.isGoDark) {
                    return;
                }
                (0, _utils.forEach)(this.$branchTrees, function (tree) {
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
                (0, _utils.forEach)(this.$branchTrees, function (tree) {
                    return tree.restoreFromDark();
                });
                this.isGoDark = false;

                this.renderDOM();
            }
        }], [{
            key: 'isProperNode',
            value: function isProperNode(node, config) {
                return getIfNodeType(node, config) === IfDirectiveParser.IF_START;
            }
        }, {
            key: 'isEndNode',
            value: function isEndNode(node, config) {
                return getIfNodeType(node, config) === IfDirectiveParser.IF_END;
            }
        }, {
            key: 'findEndNode',
            value: function findEndNode() {
                return this.walkToEnd.apply(this, arguments);
            }
        }, {
            key: 'getNoEndNodeError',
            value: function getNoEndNodeError() {
                return new Error('the if directive is not properly ended!');
            }
        }]);

        return IfDirectiveParser;
    }(_DirectiveParser3.default);

    IfDirectiveParser.IF_START = 1;
    IfDirectiveParser.ELIF = 2;
    IfDirectiveParser.ELSE = 3;
    IfDirectiveParser.IF_END = 4;

    function getIfNodeType(node, config) {
        var nodeType = node.getNodeType();
        if (nodeType !== _Node2.default.COMMENT_NODE) {
            return;
        }

        var nodeValue = node.getNodeValue();
        if (config.ifPrefixRegExp.test(nodeValue)) {
            return IfDirectiveParser.IF_START;
        }

        if (config.elifPrefixRegExp.test(nodeValue)) {
            return IfDirectiveParser.ELIF;
        }

        if (config.elsePrefixRegExp.test(nodeValue)) {
            return IfDirectiveParser.ELSE;
        }

        if (config.ifEndPrefixRegExp.test(nodeValue)) {
            return IfDirectiveParser.IF_END;
        }
    }

    exports.default = IfDirectiveParser;
});