/**
 * @file 指令解析器抽象类。指令节点一定是注释节点
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Parser = require('./Parser');
var Node = require('../nodes/Node');
var Tree = require('../trees/Tree');

module.exports = Parser.extends(
    {

        /**
         * 根据父级数创建子树。
         *
         * @protected
         * @param  {Tree} parentTree 父级树
         * @param {nodes/Node} startNode 开始节点
         * @param {nodes/Node} endNode 结束节点
         * @return {Tree}  创建好的子树
         */
        createTree: function (parentTree, startNode, endNode) {
            var tree = new Tree({
                startNode: startNode,
                endNode: endNode
            });
            tree.setParent(this.tree);
            tree.rootScope.setParent(parentTree.rootScope);
            parentTree.rootScope.addChild(tree.rootScope);
            return tree;
        }
    },
    {
        isProperNode: function (node, config) {
            return node.getNodeType() === Node.COMMENT_NODE;
        },

        $name: 'DirectiveParser'
    }
);
