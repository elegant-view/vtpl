/**
 * @file 管理节点的工具
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Base = require('../Base');
var Node = require('./Node');

var NodesManager = Base.extends(
    {
        initialize: function () {
            this.$idCounter = 0;
            this.$nodesMap = {};
        },

        /**
         * 根据 domNode 拿到对应的经过包装的 nodes/Node 实例
         *
         * @public
         * @param  {Node} domNode dom节点
         * @return {nodes/Node}      nodes/Node 实例
         */
        getNode: function (domNode) {
            var nodeId = domNode.$nodeId;

            if (!nodeId) {
                nodeId = domNode.$nodeId = ++this.$idCounter;
                this.$nodesMap[nodeId] = new Node(domNode, this);
            }

            return this.$nodesMap[nodeId];
        },

        /**
         * 销毁所有的节点
         *
         * @public
         */
        destroy: function () {
            for (var id in this.$nodesMap) {
                this.$nodesMap[id].destroy();
            }
        },

        createElement: function () {
            return this.getNode(document.createElement.apply(document, arguments));
        }
    },
    {
        $name: 'NodesManager'
    }
);


module.exports = NodesManager;
