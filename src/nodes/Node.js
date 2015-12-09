/**
 * @file 实现一套本库需要的节点类，将所有直接操作DOM的代码都封装在这里。
 *       如无特别说明，以`$`符号开头的成员变量是受保护的，以`$$`符号开头的成员变量是私有的。
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Base = require('../Base');
var utils = require('../utils');

var Node = Base.extends(
    {
        initialize: function (node) {
            Base.prototype.initialize.apply(this, arguments);

            // 弱弱地判断一下node是不是节点
            if (node.ownerDocument !== document) {
                throw new TypeError('wrong `node` argument');
            }

            this.$node = node;
        },

        getNodeType: function () {
            return this.$node.nodeType;
        },

        getChildNodes: function () {
            var nodes = [];
            var childNodes = this.$node.childNodes;
            for (var i = 0, il = childNodes.length; i < il; ++i) {
                nodes.push(new Node(childNodes[i]));
            }
            return nodes;
        },

        equal: function (node) {
            return this.$node === node.$node;
        },

        getParentNode: function () {
            return new Node(this.$node.parentNode);
        },

        getNextSibling: function () {
            if (!this.$node.nextSibling) {
                return null;
            }

            return new Node(this.$node.nextSibling);
        },

        getPreviousSibling: function () {
            if (!this.$node.previousSibling) {
                return null;
            }

            return new Node(this.$node.previousSibling);
        },

        getAttribute: function (name) {
            return this.$node.getAttribute(name);
        },

        setAttribute: function (name, value) {
            this.$node.setAttribute(name, value);
        },

        getAttributes: function () {
            return this.$node.attributes;
        },

        getNodeValue: function () {
            return this.$node.nodeValue;
        },

        setNodeValue: function (value) {
            this.$node.nodeValue = value;
        },

        /**
         * 判断当前节点是否和node是兄弟关系，并且在node之后。
         *
         * @public
         * @param  {Node}  node 要对比的节点
         * @return {boolean}
         */
        isAfter: function (node) {
            if (!this.isBrotherWith(node)
                || this.equal(node)
            ) {
                return false;
            }

            for (var curNode = node.$node; curNode; curNode = curNode.nextSibling) {
                if (curNode === this.$node) {
                    return true;
                }
            }

            return false;
        },

        isBrotherWith: function (node) {
            return this.getParentNode().equal(node.getParentNode());
        }
    },
    {
        $name: 'Node',

        ELEMENT_NODE: 1,
        ATTRIBUTE_NODE: 2,
        TEXT_NODE: 3,
        CDATA_SECTION_NODE: 4,
        ENTITY_REFERENCE_NODE: 5,
        ENTITY_NODE: 6,
        PROCESSING_INSTRUCTION_NODE: 7,
        COMMENT_NODE: 8,
        DOCUMENT_NODE: 9,
        DOCUMENT_TYPE_NODE: 10,
        DOCUMENT_FRAGMENT_NODE: 11,
        NOTATION_NODE: 12,

        /**
         * 将NodeList转换成真正的数组
         *
         * @static
         * @param {(NodeList|Array.<Node>)} nodeList DOM节点列表
         * @return {Array.<Node>}
         */
        toArray: function (nodeList) {
            if (utils.isArray(nodeList)) {
                return nodeList;
            }

            try {
                return utils.slice(nodeList, 0);
            }
            catch (e) {
                // IE8 及更早版本将 NodeList 实现为一个 COM 对象，因此只能一个一个遍历出来。
                var list = [];
                for (var i = 0, il = nodeList.length; i < il; ++i) {
                    list.push(nodeList[i]);
                }
                return list;
            }
        },

        /**
         * 遍历DOM树
         *
         * @static
         * @param {Node} startNode 起始节点
         * @param {Node} endNode 终止节点
         * @param {function(Node):(Node|undefined|boolean)} iterateFn 迭代函数。
         *                                                            如果这个函数返回了一个Node对象，则把这个Node对象当成下一个要遍历的节点
         * @return {boolean} 如果是true，说明在遍历子节点的时候中途中断了，不需要继续遍历了。
         */
        iterate: function (startNode, endNode, iterateFn) {
            if (!utils.isFunction(iterateFn)) {
                return;
            }

            var curNode = startNode;
            while (curNode) {
                var nextNode = iterateFn(curNode);
                if (nextNode === true) {
                    return true;
                }

                if (Node.ELEMENT_NODE === curNode.getNodeType()) {
                    var childNodes = curNode.getChildNodes();
                    if (childNodes.length) {
                        if (true === Node.iterate(
                            childNodes[0],
                            childNodes[childNodes.length - 1],
                            iterateFn)
                        ) {
                            curNode = null;
                            return true;
                        }
                    }
                }

                if (nextNode instanceof Node) {
                    if (!nextNode.isAfter(curNode)) {
                        throw new Error('wrong return value');
                    }

                    curNode = nextNode;
                }
                else if (!nextNode) {
                    curNode = curNode.getNextSibling();
                }

                if (curNode && curNode.isAfter(endNode)) {
                    curNode = null;
                }

            }
        }
    }
);

module.exports = Node;
