/**
 * @file 最终的树
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var utils = require('../utils');
var ScopeModel = require('../ScopeModel');
var Base = require('../Base');
var Node = require('../nodes/Node');

var ParserClasses = [];

module.exports = Base.extends(
    {

        /**
         * 树的初始化方法。
         *
         * @protected
         * @param  {Object} options 初始化参数
         * @param {nodes/Node} options.startNode 这棵树要解析的dom块的开始节点
         * @param {nodes/Node} options.endNode 这棵树要解析的dom块的结束节点
         */
        initialize: function (options) {
            Base.prototype.initialize.apply(this, arguments);

            this.startNode = options.startNode;
            this.endNode = options.endNode;

            this.treeVars = {};
            this.$parsers = [];
            this.$parent = null;
            this.$$nodeIdParserMap = {};

            this.rootScope = new ScopeModel();
        },

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
        setTreeVar: function (name, value) {
            if (this.treeVars[name] !== undefined) {
                return false;
            }
            this.treeVars[name] = value;
            return true;
        },

        unsetTreeVar: function (name) {
            this.treeVars[name] = undefined;
        },

        /**
         * 获取绑定到树上的额外变量
         *
         * @public
         * @param  {string} name                  变量名
         * @param  {boolean=} shouldNotFindInParent 如果在当前树中没找到，是否到父级树中去找。
         *                                         true就代表不去，false就代表要去
         * @return {*}
         */
        getTreeVar: function (name, shouldNotFindInParent) {
            var val = this.treeVars[name];
            if (!shouldNotFindInParent
                && val === undefined
                && this.$parent !== undefined
            ) {
                val = this.$parent.getTreeVar(name);
            }
            return val;
        },

        setParent: function (parent) {
            this.$parent = parent;
        },

        getScopeByName: function (name) {
            var scopes = this.getTreeVar('scopes');
            if (!scopes) {
                return;
            }
            return scopes[name];
        },

        /**
         * 遍历DOM树，生成解析器类->搜集指令和表达式并生成相应的DOM更新函数->绑定ScopeModel
         *
         * @public
         */
        traverse: function () {
            var me = this;
            var delayFns = [];
            Node.iterate(this.startNode, this.endNode, function (node) {
                var options = {
                    startNode: node,
                    node: node,
                    tree: me
                };

                var parser;
                for (var i = 0, il = ParserClasses.length; i < il; ++i) {
                    var ParserClass = ParserClasses[i];
                    parser = me.createParser(ParserClass, options);

                    if (!parser) {
                        continue;
                    }
                    me.$parsers.push(parser);
                    break;
                }

                if (!parser) {
                    throw new Error('no such parser');
                }

                delayFns.push(handle);

                function handle() {
                    parser.collectExprs();
                    // 将解析器对象和对应树的scope绑定起来
                    parser.linkScope();
                }

                var nextNode = parser.getEndNode().getNextSibling();
                return nextNode;
            });

            for (var i = 0, il = delayFns.length; i < il; ++i) {
                delayFns[i]();
            }
        },

        setData: function (data) {
            data = data || {};
            this.rootScope.set(data);
        },

        goDark: function () {
            var node = this.startNode;
            while (node) {
                var nodeType = node.getNodeType();
                if (nodeType === Node.ELEMENT_NODE || nodeType === Node.TEXT_NODE) {
                    node.hide();
                }

                node = node.getNextSibling();
                if (!node || node.equal(this.endNode)) {
                    break;
                }
            }
        },

        restoreFromDark: function () {
            var node = this.startNode;
            while (node) {
                var nodeType = node.getNodeType();
                if (nodeType === Node.ELEMENT_NODE || nodeType === Node.TEXT_NODE) {
                    node.show();
                }

                node = node.getNextSibling();
                if (!node || node.equal(this.endNode)) {
                    break;
                }
            }
        },

        setDirtyChecker: function (dirtyChecker) {
            this.dirtyChecker = dirtyChecker;
        },

        destroy: function () {
            walk(this.$parsers);

            this.startNode = null;
            this.endNode = null;
            this.config = null;

            this.$parser = null;
            this.treeVars = null;

            this.$$nodeIdParserMap = null;

            if (this.dirtyChecker) {
                this.dirtyChecker.destroy();
                this.dirtyChecker = null;
            }

            function walk(parsers) {
                utils.each(parsers, function (parser) {
                    parser.destroy();
                });
            }
        },

        /**
         * 创建解析器实例。
         *
         * @inner
         * @param {Class} ParserClass parser 类
         * @param  {Object} options 初始化参数
         * @return {Object}         返回值
         */
        createParser: function (ParserClass, options) {
            var startNode = options.startNode || options.node;
            var config = this.getTreeVar('config');
            if (!ParserClass.isProperNode(startNode, config)) {
                return;
            }

            var endNode;
            if (ParserClass.findEndNode) {
                endNode = ParserClass.findEndNode(startNode, config);

                if (!endNode) {
                    throw ParserClass.getNoEndNodeError();
                }
                else if (endNode.parentNode !== startNode.parentNode) {
                    throw new Error('the relationship between start node and end node is not brotherhood!');
                }
            }

            var parser = new ParserClass(
                utils.extend(
                    options,
                    {
                        endNode: endNode
                    }
                )
            );

            var key = !endNode || startNode.equal(endNode)
                ? startNode.getNodeId()
                : startNode.getNodeId() + '-' + endNode.getNodeId();
            this.$$nodeIdParserMap[key] = parser;

            return parser;
        }
    },
    {

        /**
         * 注册一下解析器类。
         *
         * 解析器类的命中规则是：
         *
         * 当遇到一个节点的时候，会严格按照ParserClasses数组的顺序来判断当前的节点是否归该解析器类处理（isProperNode）。
         * 所以，越是靠前的解析器类，就拥有越高的优先级。
         *
         * 在注册解析器类的时候，这个顺序就会定下来，并且子类拥有比父类更高的优先级。
         *
         * @param  {Class} ParserClass 解析器类
         */
        registeParser: function (ParserClass) {
            ParserClasses.push(ParserClass);

            ParserClasses.sort(function (prev, next) {
                return utils.isSubClassOf(prev, next) ? -1 : 1;
            });
        },

        $name: 'Tree'
    }
);






