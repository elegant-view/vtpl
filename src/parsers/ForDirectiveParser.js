/**
 * @file for 指令
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import DirectiveParser from './DirectiveParser';
import {each, createExprFn, bind} from '../utils';
import Tree from '../trees/Tree';
import Node from '../nodes/Node';

const ForDirectiveParser = DirectiveParser.extends(
    {

        initialize(options) {
            DirectiveParser.prototype.initialize.apply(this, arguments);

            this.startNode = options.startNode;
            this.endNode = options.endNode;

            this.tplSeg = null;
            this.expr = null;
            this.exprFn = null;
            this.updateFn = null;
            this.trees = [];
        },

        collectExprs() {
            if (this.startNode.getNextSibling().equal(this.endNode)) {
                return;
            }

            // for指令之间没有节点
            if (this.startNode.getNextSibling().equal(this.endNode)) {
                return;
            }

            let nodesManager = this.tree.getTreeVar('nodesManager');
            this.tplSeg = nodesManager.createElement('div');
            for (let curNode = this.startNode.getNextSibling();
                curNode && !curNode.isAfter(this.endNode.getPreviousSibling());
            ) {
                let nextNode = curNode.getNextSibling();
                this.tplSeg.appendChild(curNode);
                curNode = nextNode;
            }

            let config = this.tree.getTreeVar('config');
            let exprCalculater = this.tree.getTreeVar('exprCalculater');

            this.expr = this.startNode.getNodeValue().match(config.getForExprsRegExp())[1];
            this.exprFn = createExprFn(config.getExprRegExp(), this.expr, exprCalculater);
            this.updateFn = this.createUpdateFn(
                this.startNode.getNextSibling(),
                this.endNode.getPreviousSibling(),
                this.startNode.getNodeValue()
            );
        },

        linkScope() {
            this.onChange();
            DirectiveParser.prototype.linkScope.apply(this, arguments);
        },

        onChange() {
            if (!this.expr) {
                return;
            }

            let exprValue = this.exprFn(this.tree.rootScope);
            if (this.dirtyCheck(this.expr, exprValue, this.exprOldValue)) {
                this.updateFn(exprValue, this.tree.rootScope);
            }

            this.exprOldValue = exprValue;

            DirectiveParser.prototype.onChange.apply(this, arguments);
        },

        destroy() {
            each(this.trees, function (tree) {
                tree.destroy();
            });

            this.tplSeg = null;
            this.expr = null;
            this.exprFn = null;
            this.updateFn = null;
            this.startNode = null;
            this.endNode = null;

            DirectiveParser.prototype.destroy.apply(this, arguments);
        },

        /**
         * 创建树
         *
         * @protected
         * @return {Tree}
         */
        createTree() {
            let parser = this;
            let nodesManager = this.tree.getTreeVar('nodesManager');
            let copySeg = nodesManager.createElement('div');
            copySeg.setInnerHTML(this.tplSeg.getInnerHTML());

            let childNodes = copySeg.getChildNodes();
            let startNode = childNodes[0];
            let endNode = childNodes[childNodes.length - 1];

            let curNode = startNode;
            while (curNode && !curNode.isAfter(endNode)) {
                let nextNode = curNode.getNextSibling();
                parser.endNode.getParentNode().insertBefore(curNode, parser.endNode);
                curNode = nextNode;
            }

            let tree = DirectiveParser.prototype.createTree.call(
                this,
                this.tree,
                startNode,
                endNode
            );
            tree.traverse();
            return tree;
        },

        /**
         * 创建更新函数。
         * 更新函数会根据迭代的数据动态地创建Tree实例：迭代了多少次，就会创建多少个。
         * for指令下的Tree实例目前是不会销毁的，除非解析器实例被销毁。
         * for指令下的Tree实例只会随着迭代次数的增加而增多，并不会消减。
         *
         * @private
         * @param  {nodes/Node} startNode 起始节点
         * @param  {nodes/Node} endNode   结束节点
         * @param  {string} fullExpr  for指令中完整的表达式，比如`<!-- for: ${list} as ${item} -->`就是`for: ${list} as ${item}`。
         * @return {function(*,ScopeModel)}           dom更新函数
         */
        createUpdateFn(startNode, endNode, fullExpr) {
            let parser = this;
            let config = this.tree.getTreeVar('config');
            let domUpdater = this.tree.getTreeVar('domUpdater');
            let itemVariableName = fullExpr.match(config.getForItemValueNameRegExp())[1];
            let taskId = domUpdater.generateTaskId();
            return function (exprValue, scopeModel) {
                let index = 0;
                for (let k in exprValue) {
                    if (!parser.trees[index]) {
                        parser.trees[index] = parser.createTree();
                    }

                    parser.trees[index].restoreFromDark();
                    parser.trees[index].setDirtyChecker(parser.dirtyChecker);

                    let local = {
                        key: k,
                        index: index
                    };
                    local[itemVariableName] = exprValue[k];

                    parser.trees[index].rootScope.setParent(scopeModel);
                    scopeModel.addChild(parser.trees[index].rootScope);

                    parser.trees[index].rootScope.set(local);

                    ++index;
                }

                domUpdater.addTaskFn(
                    taskId,
                    bind(
                        function (trees, index) {
                            for (let i = index, il = trees.length; i < il; i++) {
                                trees[i].goDark();
                            }
                        },
                        null,
                        parser.trees,
                        index
                    )
                );
            };
        },

        // 主要用于遍历的时候，不让遍历器进入子孙节点
        getChildNodes() {
            return [];
        },

        getEndNode() {
            return this.endNode;
        },

        getStartNode() {
            return this.startNode;
        }
    },
    {
        isProperNode(node, config) {
            return DirectiveParser.isProperNode(node, config)
                && config.forPrefixRegExp.test(node.getNodeValue());
        },

        isEndNode(node, config) {
            let nodeType = node.getNodeType();
            return nodeType === Node.COMMENT_NODE
                && config.forEndPrefixRegExp.test(node.getNodeValue());
        },

        findEndNode() {
            return this.walkToEnd.apply(this, arguments);
        },

        getNoEndNodeError() {
            return new Error('the `for` directive is not properly ended!');
        },

        $name: 'ForDirectiveParser'
    }
);

Tree.registeParser(ForDirectiveParser);
export default ForDirectiveParser;

