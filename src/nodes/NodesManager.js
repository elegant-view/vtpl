/**
 * @file 管理节点的工具
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Base from '../Base';
import Node from './Node';

let managerIdCounter = 0;

const NodesManager = Base.extends(
    {
        initialize() {
            this.$idCounter = 0;
            this.$nodesMap = {};
            this.$$domNodeIdKey = 'nodeId-' + ++managerIdCounter;
        },

        /**
         * 根据 domNode 拿到对应的经过包装的 nodes/Node 实例
         *
         * @public
         * @param  {Node|Undefined}  domNode dom节点
         * @return {nodes/Node}      nodes/Node 实例
         */
        getNode(domNode) {
            if (!domNode) {
                return null;
            }

            let nodeId = domNode[this.$$domNodeIdKey];

            if (!nodeId) {
                nodeId = domNode[this.$$domNodeIdKey] = ++this.$idCounter;
            }

            if (!this.$nodesMap[nodeId]) {
                this.$nodesMap[nodeId] = new Node(domNode, this);
            }

            return this.$nodesMap[nodeId];
        },

        /**
         * 销毁所有的节点
         *
         * @public
         */
        destroy() {
            for (let id in this.$nodesMap) {
                this.$nodesMap[id].destroy();
            }
        },

        createElement() {
            return this.getNode(document.createElement.apply(document, arguments));
        },

        createComment() {
            return this.getNode(document.createComment.apply(document, arguments));
        }
    },
    {
        $name: 'NodesManager'
    }
);


export default NodesManager;
