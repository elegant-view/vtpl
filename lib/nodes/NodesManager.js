define(['exports', '../Base', './Node', './Fragment'], function (exports, _Base2, _Node, _Fragment) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _Base3 = _interopRequireDefault(_Base2);

    var _Node2 = _interopRequireDefault(_Node);

    var _Fragment2 = _interopRequireDefault(_Fragment);

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

    var managerIdCounter = 0;

    var NodesManager = function (_Base) {
        _inherits(NodesManager, _Base);

        function NodesManager() {
            _classCallCheck(this, NodesManager);

            var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(NodesManager).call(this));

            _this.$idCounter = 0;
            _this.$nodesMap = {};
            _this.$$domNodeIdKey = 'nodeId-' + ++managerIdCounter;
            return _this;
        }

        /**
         * 根据 domNode 拿到对应的经过包装的 nodes/Node 实例
         *
         * @public
         * @param  {Node|Undefined}  domNode dom节点
         * @return {nodes/Node}      nodes/Node 实例
         */


        _createClass(NodesManager, [{
            key: 'getNode',
            value: function getNode(domNode) {
                if (!domNode) {
                    return null;
                }

                var nodeId = domNode[this.$$domNodeIdKey];

                if (!nodeId) {
                    nodeId = domNode[this.$$domNodeIdKey] = ++this.$idCounter;
                }

                if (!this.$nodesMap[nodeId]) {
                    this.$nodesMap[nodeId] = new _Node2.default(domNode, this);
                }

                return this.$nodesMap[nodeId];
            }
        }, {
            key: 'destroy',
            value: function destroy() {
                /* eslint-disable guard-for-in */
                for (var id in this.$nodesMap) {
                    this.$nodesMap[id].destroy();
                }
                /* eslint-enable guard-for-in */
            }
        }, {
            key: 'createElement',
            value: function createElement() {
                return this.getNode(document.createElement.apply(document, arguments));
            }
        }, {
            key: 'createComment',
            value: function createComment() {
                return this.getNode(document.createComment.apply(document, arguments));
            }
        }, {
            key: 'createDocumentFragment',
            value: function createDocumentFragment() {
                return new _Fragment2.default(this);
            }
        }]);

        return NodesManager;
    }(_Base3.default);

    exports.default = NodesManager;
});